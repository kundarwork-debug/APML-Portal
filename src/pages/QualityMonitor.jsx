import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileDown, Github, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import './QualityMonitor.css'

const RUNS_API='https://api.github.com/repos/kundarwork-debug/APML-Portal/actions/workflows/quality-monitor.yml/runs?per_page=10'
const GITHUB_ACTIONS='https://github.com/kundarwork-debug/APML-Portal/actions/workflows/quality-monitor.yml'
const formatDate=value=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'
const statusLabel=run=>run.status==='completed'?(run.conclusion==='success'?'Passed':run.conclusion==='failure'?'Failed':run.conclusion||'Completed'):run.status==='in_progress'?'Running':run.status==='queued'?'Queued':run.status||'Unknown'
const statusClass=run=>run.status!=='completed'?'running':run.conclusion==='success'?'success':run.conclusion==='failure'?'failure':'neutral'
function StatusIcon({run}){return run.status==='completed'?(run.conclusion==='success'?<CheckCircle2/>:<XCircle/>):run.status==='in_progress'?<RefreshCw className="qm-spin"/>:<Clock3/>}

export default function QualityMonitor(){
 const [runs,setRuns]=useState([])
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')
 const [updated,setUpdated]=useState(null)
 const [jobs,setJobs]=useState([])
 const [jobsError,setJobsError]=useState('')
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const response=await fetch(RUNS_API,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'})
   if(!response.ok){
    if(response.status===404)throw new Error('GitHub could not find the workflow runs. The repository may be private, Actions may be disabled, or the first run has not been created yet.')
    if(response.status===403)throw new Error('GitHub API rate limit reached. Please try again in a few minutes.')
    throw new Error('GitHub returned HTTP '+response.status+'.')
   }
   const data=await response.json()
   const items=Array.isArray(data.workflow_runs)?data.workflow_runs:[]
   setRuns(items);setUpdated(new Date())
   if(items[0]?.id){
    try{
     const jobResponse=await fetch('https://api.github.com/repos/kundarwork-debug/APML-Portal/actions/runs/'+items[0].id+'/jobs',{headers:{Accept:'application/vnd.github+json'},cache:'no-store'})
     if(jobResponse.ok){const jobData=await jobResponse.json();setJobs(jobData.jobs||[]);setJobsError('')}
     else{setJobs([]);setJobsError('Individual check details are not available yet.')}
    }catch{setJobs([]);setJobsError('Could not load individual check details.')}
   }else{setJobs([]);setJobsError('No workflow runs have been recorded yet.')}
  }catch(e){setError(e.message||'Could not load GitHub Actions.')}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{load();const timer=setInterval(load,60000);return()=>clearInterval(timer)},[load])
 const latest=runs[0]
 const counts={passed:runs.filter(r=>r.conclusion==='success').length,failed:runs.filter(r=>r.conclusion==='failure').length,running:runs.filter(r=>r.status!=='completed').length}
 return <div className="qm-page">
  <header className="qm-heading"><div><span className="qm-kicker"><ShieldCheck size={14}/> QUALITY &amp; RELIABILITY</span><h1>Quality monitor</h1><p>Automated checks for the APML Portal code and live website.</p></div><div className="qm-actions"><span>{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Auto-refresh · 60 sec'}</span><button onClick={load} disabled={busy}><RefreshCw size={16} className={busy?'qm-spin':''}/>{busy?'Checking…':'Refresh'}</button></div></header>
  {error?<section className="qm-error"><AlertTriangle size={20}/><div><strong>Could not load audit results</strong><p>{error}</p><a href={GITHUB_ACTIONS} target="_blank" rel="noreferrer">Open GitHub Actions <ExternalLink size={13}/></a></div></section>:null}
  {!error&&<><section className="qm-summary">
   <article><span>Latest audit</span><strong className={latest?statusClass(latest):'neutral'}>{latest?statusLabel(latest):busy?'Loading…':'No runs yet'}</strong><small>{latest?formatDate(latest.created_at):'Waiting for the first run'}</small></article>
   <article><span>Passed runs</span><strong className="success">{counts.passed}</strong><small>Successful workflow runs</small></article>
   <article><span>Failed runs</span><strong className={counts.failed?'failure':'success'}>{counts.failed}</strong><small>Runs needing attention</small></article>
   <article><span>In progress</span><strong>{counts.running}</strong><small>Queued or running</small></article>
  </section>
  {latest&&<section className="qm-panel qm-latest"><div className="qm-panel-heading"><div><span className="qm-section-label">MOST RECENT RUN</span><h2>{latest.display_title||latest.name||'APML Quality Monitor'}</h2><p>Branch: <b>{latest.head_branch||'—'}</b> · Commit: <code>{(latest.head_sha||'').slice(0,7)||'—'}</code></p></div><span className={'qm-status '+statusClass(latest)}><StatusIcon run={latest}/>{statusLabel(latest)}</span></div>
   <div className="qm-meta"><span>Started <b>{formatDate(latest.created_at)}</b></span><span>Event <b>{latest.event||'—'}</b></span><span>Run <b>#{latest.run_number}</b></span></div>
   <div className="qm-jobs"><h3>Check details</h3>{jobs.length?jobs.map(job=><div className="qm-job" key={job.id}><span className={'qm-job-dot '+(job.conclusion==='success'?'success':job.conclusion==='failure'?'failure':job.status==='in_progress'?'running':'neutral')}/><span>{job.name}</span><b>{job.status==='completed'?(job.conclusion||'Completed'):job.status}</b></div>):<p className="qm-muted">{jobsError||'Loading check details…'}</p>}</div>
   <a className="qm-primary-link" href={latest.html_url} target="_blank" rel="noreferrer">View full run &amp; download reports <ExternalLink size={15}/></a>
  </section>}
  <section className="qm-panel"><div className="qm-panel-heading"><div><span className="qm-section-label">HISTORY</span><h2>Recent audits</h2><p>Runs triggered by code updates, pull requests or the weekly schedule.</p></div><a className="qm-text-link" href={GITHUB_ACTIONS} target="_blank" rel="noreferrer">All runs <ExternalLink size={14}/></a></div>
   {runs.length?<div className="qm-history">{runs.map(run=><a className="qm-run" key={run.id} href={run.html_url} target="_blank" rel="noreferrer"><span className={'qm-run-icon '+statusClass(run)}><StatusIcon run={run}/></span><span className="qm-run-copy"><b>{run.display_title||run.name||'Quality monitor'}</b><small>{formatDate(run.created_at)} · {run.event||'—'} · #{run.run_number}</small></span><span className={'qm-status qm-status-small '+statusClass(run)}>{statusLabel(run)}</span><ExternalLink className="qm-external" size={14}/></a>)}</div>:!busy&&!error?<p className="qm-muted">No audit runs found yet. Once GitHub Actions runs, results will appear here.</p>:null}
  </section></>}
  <section className="qm-note"><Activity size={17}/><p><b>What is checked?</b> React build, npm dependency vulnerabilities, important live-page links, and Lighthouse performance, accessibility, SEO and best-practice scores. Open a run to see its logs and download available reports.</p></section>
  <p className="qm-disclaimer">This page reads public GitHub Actions run information. It does not expose repository secrets or allow a new workflow to be triggered from the portal.</p>
 </div>
}
