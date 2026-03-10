import React,{useEffect,useState} from 'react';
import {BrowserOAuthClient} from '@atproto/oauth-client-browser';
const s={fs:{background:'#000',color:'#0f0',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'monospace',textAlign:'center'},btn:{padding:'20px',background:'#111',color:'#0f0',border:'1px solid #0f0',cursor:'pointer',margin:'5px'},gBtn:{padding:'20px',background:'#111',color:'#f0f',border:'1px solid #f0f',cursor:'pointer',margin:'5px'}};
export default function App(){
const [c,setC]=useState(null);const [sess,setSess]=useState(null);const [v,setV]=useState('hub');
useEffect(()=>{const client=new BrowserOAuthClient({handleResolver:'https://bsky.social',clientMetadata:'https://quips.cc/client-metadata.json'});client.init().then(r=>{if(r?.session)setSess(r.session);setC(client);});},[]);
