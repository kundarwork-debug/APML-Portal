export default function EditorPage(){
  return <iframe
    title="APML Legacy Quotation Editor"
    src="/modules/editor.html"
    style={{display:'block',width:'100%',height:'100vh',minHeight:'100vh',border:0,background:'#FDF8F5'}}
    allow="clipboard-read; clipboard-write"
  />
}
