'use client';
import {useState} from 'react';
export function DeviceReplacementButton({deviceId}:{deviceId:string}){
 const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');
 async function requestReplacement(){setBusy(true);setMsg('');try{const response=await fetch('/api/devices/replacement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to request replacement.');setMsg('Replacement request sent to support.');}catch(error){setMsg(error instanceof Error?error.message:'Unable to request replacement.')}finally{setBusy(false)}}
 return <div><button className="button secondary small" disabled={busy} onClick={requestReplacement}>{busy?'Sending…':'Request replacement'}</button>{msg&&<small>{msg}</small>}</div>
}