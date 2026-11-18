const DRIVE_API_BASE=(import.meta.env.VITE_DRIVE_API_BASE||'https://apml-drive-api.kundar-work.workers.dev').replace(/\/$/,'');
export async function driveApi(path,{method='GET',body}={}){
 const response=await fetch(DRIVE_API_BASE+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok===false)throw new Error(data.error||'Drive request failed ('+response.status+').');
 return data;
}
