  useEffect(() => {
    let live = true
    let interval
    const refreshVisitors = async () => {
      try {
        const response = await fetch('https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=90', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'Firebase visitor analytics could not be loaded.')
        const data = result.visitorIntelligence || {}
        const hours = Array.from({ length: 24 }, (_, hour) => {
          const match = (data.peakHours || []).find(item => Number(item.hour) === hour)
          return { hour, count: Number(match?.count) || 0 }
        })
        if (live) {
          setVisitorStats({
            visitors: Number(data.visitors) || 0,
            visitorsToday: Number(data.visitorsToday) || 0,
            activeNow: Number(data.activeNow) || 0,
            pageViews: Number(data.pageViews) || 0,
            sessionCount: Number(data.sessions) || 0,
            averageSessionSeconds: Number(data.averageSessionSeconds) || 0,
            dailyVisitors: data.dailyVisitors || [],
            devices: data.devices || [],
            browsers: data.browsers || [],
            topPages: data.topPages || [],
            hourlyActivity: hours,
            cities: data.cities || []
          })
          setVisitorError('')
        }
      } catch (error) {
        if (live) setVisitorError(error.message || 'Could not read visitor intelligence from Firebase.')
      }
    }
    refreshVisitors()
    interval = window.setInterval(refreshVisitors, 30000)
    return () => { live = false; if (interval) window.clearInterval(interval) }
  }, [])

  useEffect(() => {
    let live=true, refs=[]
    ;(async()=>{
      try{
        const {database}=await getApmlPresenceServices()
        if(!live)return
        const sessionsRef=database.ref('visitor_intelligence/sessions'), dailyRef=database.ref('visitor_intelligence/daily')
        let sessions=null,daily=null
        const process=()=>{
          if(!live)return
          const all=[]
          Object.entries(sessions||{}).forEach(([uid,rows])=>Object.entries(rows||{}).forEach(([id,row])=>all.push({...row,uid,id})))
          const cutoff=Date.now()-90*86400000, recent=all.filter(row=>Number(row.startedAt)>=cutoff)
          const today=Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
          const unique=new Set(recent.map(row=>row.uid)), visitorsToday=Object.keys(daily?.[today]||{}).length
          const pageMap={}, deviceMap={}, browserMap={}, hours=Array.from({length:24},(_,hour)=>({hour,count:0})), dayMap={}
          let pageViews=0,seconds=0,active=0
          recent.forEach(row=>{
            pageViews+=Number(row.pageViews)||0;seconds+=Number(row.totalSeconds)||0
            if(Number(row.lastSeen)>Date.now()-90000)active++
            const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',hour:'2-digit',hourCycle:'h23'}).format(new Date(Number(row.startedAt))))
            if(hours[h])hours[h].count++
            const day=Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(row.startedAt)))
            dayMap[day]=(dayMap[day]||new Set());dayMap[day].add(row.uid)
            const device=row.device||'Unknown', browser=row.browser||'Unknown'
            deviceMap[device]=(deviceMap[device]||0)+1;browserMap[browser]=(browserMap[browser]||0)+1
            Object.values(row.pages||{}).forEach(p=>{const name=p.name||'/';pageMap[name]=(pageMap[name]||0)+(Number(p.views)||0)})
          })
          const rows=obj=>Object.entries(obj).map(([name,count])=>({name,count})).sort((x,y)=>y.count-x.count)
          setVisitorStats({visitors:unique.size,visitorsToday,activeNow:active,pageViews,sessionCount:recent.length,averageSessionSeconds:recent.length?Math.round(seconds/recent.length):0,dailyVisitors:Object.entries(dayMap).map(([date,set])=>({date,count:set.size})).sort((x,y)=>x.date.localeCompare(y.date)),devices:rows(deviceMap),browsers:rows(browserMap),topPages:Object.entries(pageMap).map(([name,views])=>({name,views})).sort((x,y)=>y.views-x.views),hourlyActivity:hours})
          setVisitorError('')
          setVisitorConnection({state:'connected',message:'Visitor records are read directly from Firebase Realtime Database.',backend:'firebase'})
        }
        const sh=snap=>{sessions=snap.val();process()}, dh=snap=>{daily=snap.val();process()}
        sessionsRef.on('value',sh,e=>live&&setVisitorError(e.message||'Firebase sessions read failed.'))
        dailyRef.on('value',dh,e=>live&&setVisitorError(e.message||'Firebase daily records read failed.'))
        refs.push([sessionsRef,sh],[dailyRef,dh])
      }catch(e){if(live){setVisitorError(e.message||'Could not read visitor records from Firebase.');setVisitorConnection({state:'error',message:e.message||'Firebase visitor read failed.',backend:'firebase'})}}
    })()
    return()=>{live=false;refs.forEach(([ref,handler])=>ref.off('value',handler))}
  },[])
