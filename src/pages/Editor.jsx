import { useEffect } from 'react'

export default function EditorPage(){
  useEffect(()=>{
    window.location.replace('/modules/editor.html')
  },[])
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#FDF8F5',color:'#78716c',fontFamily:'sans-serif'}}>Opening the original APML Quotation Editor…</div>
}
