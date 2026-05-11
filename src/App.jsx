import { useState, useRef, useEffect, useCallback } from "react";

/* ── Stars ── */
const STARS = Array.from({length:55},(_,i)=>({
  id:i,x:Math.random()*100,y:Math.random()*100,sz:Math.random()*1.4+.3,
  td:(Math.random()*3+2).toFixed(2),tde:(Math.random()*6).toFixed(2),
  dx:((Math.random()-.5)*28).toFixed(1),dy:((Math.random()-.5)*28).toFixed(1),
  dd:(Math.random()*20+12).toFixed(1),dde:(Math.random()*-18).toFixed(1),
}));

/* ── API Providers ── */
const APIS = [
  {id:"claude",name:"Claude Sonnet 4",badge:"Default",type:"anthropic",
   model:"claude-sonnet-4-20250514",color:"#a78bfa",
   supportsThinking:true,supportsNativeSearch:true,
   keyUrl:"https://console.anthropic.com",
   note:"No key needed — runs via artifact proxy",
   desc:"Best overall. Excellent at coding, reasoning, and following instructions."},
  {id:"deepseek",name:"DeepSeek V3",badge:"Free",type:"openrouter",
   model:"deepseek/deepseek-chat-v3-0324:free",color:"#60a5fa",
   keyUrl:"https://openrouter.ai/keys",
   desc:"Top open-source model. One of the best for coding and analysis."},
  {id:"qwen",name:"Qwen 2.5 Coder",badge:"Free · Code",type:"openrouter",
   model:"qwen/qwen-2.5-coder-32b-instruct:free",color:"#34d399",
   keyUrl:"https://openrouter.ai/keys",
   desc:"32B model built for coding. Excellent at Lua, Python, JavaScript."},
  {id:"gemini",name:"Gemini 2.0 Flash",badge:"Free",type:"openrouter",
   model:"google/gemini-2.0-flash-exp:free",color:"#fbbf24",
   keyUrl:"https://openrouter.ai/keys",
   desc:"Google's fast model. Large context window, supports images."},
  {id:"llama",name:"Llama 3.3 70B",badge:"Free",type:"openrouter",
   model:"meta-llama/llama-3.3-70b-instruct:free",color:"#f472b6",
   keyUrl:"https://openrouter.ai/keys",
   desc:"Meta's open flagship. Strong at reasoning and general coding."},
  {id:"custom",name:"Custom API",badge:"BYO",type:"custom",
   model:"",color:"#94a3b8",
   desc:"Any OpenAI-compatible endpoint (Ollama, LM Studio, etc.)"},
];

/* ── Personalities ── */
const PERSONALITIES = [
  {id:"assistant",name:"Assistant",desc:"Balanced and helpful for any task"},
  {id:"coder",name:"Code Expert",desc:"Direct, code-first, no fluff"},
  {id:"roblox",name:"Roblox Dev",desc:"Expert in Roblox game dev & Lua"},
  {id:"tutor",name:"Tutor",desc:"Patient, explains step by step"},
  {id:"creative",name:"Creative",desc:"Lateral thinking, imaginative"},
];

const SYS = {
  assistant:"You are Nexus, a sharp AI assistant. Help with anything: coding, writing, analysis, math. Be concise but complete. Deliver working solutions.",
  coder:"You are Nexus, an expert programmer. Write complete, working, copy-paste-ready code. No preamble — just clean, well-commented solutions.",
  roblox:"You are Nexus, an expert Roblox game developer and Lua programmer. Build game mechanics, GUIs, animations, combat systems, RemoteEvents, and ModuleScripts. Write complete, working Roblox Lua code. Be direct and deliver ready-to-use solutions.",
  tutor:"You are Nexus, a patient tutor. Break down topics step-by-step with clear examples. Encourage understanding.",
  creative:"You are Nexus, creative and lateral-thinking. Use vivid analogies and imaginative approaches while staying practical.",
};

const PROMPTS = [
  "Write a fly script for Roblox","Build a Roblox GUI menu",
  "Make a combat system in Lua","Explain RemoteEvents & RemoteFunctions","Debug my code →",
];

/* ── Helpers ── */
const IMG_TYPES = ["image/jpeg","image/png","image/gif","image/webp"];
const toB64 = f=>new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result.split(",")[1]);x.onerror=j;x.readAsDataURL(f);});
const toTxt = f=>new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=j;x.readAsText(f);});
const uid = ()=>Math.random().toString(36).slice(2,10);
const trunc = (s,n=30)=>s?.length>n?s.slice(0,n)+"…":(s||"");

const toOpenAI = content => {
  if (typeof content==="string") return content;
  if (!Array.isArray(content)) return content;
  return content.map(b=>b.type==="image"
    ?{type:"image_url",image_url:{url:`data:${b.source.media_type};base64,${b.source.data}`}}
    :b
  );
};

const DEF = {
  apiId:"claude",apiKeys:{},customEndpoint:"",customModel:"gpt-4",
  personality:"assistant",temperature:0.7,maxTokens:2000,tavilyKey:"",sysOverride:"",
};

/* ── Icons ── */
const ISend=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IImg=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IFile=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IX=()=><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IPlus=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IChat=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IStar=({on})=><svg width="13" height="13" viewBox="0 0 24 24" fill={on?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IPen=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ITrash=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IGear=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const ISearch=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IMenu=()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IKey=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const ICheck=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;

/* ── CSS ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Outfit',sans-serif;background:#060912;color:#e4e6f0;-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh;overflow:hidden;position:relative}
.sf{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.st{position:absolute;border-radius:50%;background:#fff;will-change:opacity,transform}
@keyframes tw{0%,100%{opacity:.07}50%{opacity:.8}}
@keyframes dr{0%{transform:translate(0,0)}33%{transform:translate(var(--dx),var(--dy))}66%{transform:translate(calc(var(--dx)*-.5),calc(var(--dy)*.35))}100%{transform:translate(0,0)}}
.gl{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0}
.gl-a{width:600px;height:500px;background:radial-gradient(ellipse,rgba(88,40,210,.16) 0%,transparent 70%);top:-120px;left:-100px}
.gl-b{width:500px;height:400px;background:radial-gradient(ellipse,rgba(240,90,20,.09) 0%,transparent 70%);bottom:-80px;right:-80px}
.sb{position:relative;z-index:20;width:256px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(6,9,18,.7);border-right:1px solid rgba(255,255,255,.06);transition:width .22s cubic-bezier(.4,0,.2,1),opacity .22s;overflow:hidden}
.sb.closed{width:0;opacity:0;pointer-events:none}
.sb-top{padding:14px 10px 10px;flex-shrink:0}
.sb-logo{font-size:15px;font-weight:700;letter-spacing:.06em;background:linear-gradient(135deg,#a78bfa,#60a5fa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px;padding:0 4px}
.new-btn{width:100%;display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:10px;background:rgba(124,58,237,.13);border:1px solid rgba(124,58,237,.25);color:#c4b5fd;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .17s}
.new-btn:hover{background:rgba(124,58,237,.22);border-color:rgba(124,58,237,.42)}
.chat-list{flex:1;overflow-y:auto;padding:4px 5px;display:flex;flex-direction:column;gap:1px}
.chat-list::-webkit-scrollbar{width:3px}
.chat-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
.sec-lbl{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.18);padding:9px 7px 4px}
.ci{position:relative;display:flex;align-items:center;gap:5px;padding:7px 7px;border-radius:9px;cursor:pointer;transition:background .13s;border:1px solid transparent;min-width:0}
.ci:hover{background:rgba(255,255,255,.05)}
.ci.active{background:rgba(124,58,237,.13);border-color:rgba(124,58,237,.2)}
.ci-fav{color:rgba(255,255,255,.18);flex-shrink:0;transition:color .13s;cursor:pointer;padding:2px;border-radius:4px;background:none;border:none;display:flex;align-items:center}
.ci-fav.on{color:#fbbf24}
.ci-fav:hover{color:#fbbf24;background:rgba(251,191,36,.08)}
.ci-icon{color:rgba(255,255,255,.22);flex-shrink:0}
.ci-name{flex:1;font-size:12.5px;font-weight:400;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.ci.active .ci-name{color:#e4e6f0}
.ci-acts{display:none;align-items:center;gap:1px;flex-shrink:0}
.ci:hover .ci-acts,.ci.active .ci-acts{display:flex}
.ci-act{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.25);padding:3px;border-radius:5px;display:flex;align-items:center;transition:color .12s,background .12s}
.ci-act:hover{color:rgba(255,255,255,.75);background:rgba(255,255,255,.07)}
.ci-act.del:hover{color:#f87171;background:rgba(239,68,68,.1)}
.ci-rename{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(124,58,237,.45);border-radius:6px;color:#e4e6f0;font-family:'Outfit',sans-serif;font-size:12.5px;padding:3px 7px;outline:none;min-width:0}
.sb-bot{padding:8px 10px 12px;flex-shrink:0;border-top:1px solid rgba(255,255,255,.05)}
.sb-set{width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;background:none;border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.38);font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .16s}
.sb-set:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.11);color:rgba(255,255,255,.75)}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:5;min-width:0}
.hdr{position:relative;z-index:10;display:flex;align-items:center;gap:8px;padding:11px 16px;background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}
.hdr-menu{background:none;border:1px solid rgba(255,255,255,.07);border-radius:8px;color:rgba(255,255,255,.38);cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;transition:all .16s;flex-shrink:0}
.hdr-menu:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.75)}
.hdr-title{flex:1;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.hdr-r{display:flex;align-items:center;gap:6px;flex-shrink:0}
.tgl{display:flex;align-items:center;gap:5px;cursor:pointer;padding:4px 8px;border-radius:20px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);transition:all .16s;user-select:none}
.tgl:hover{background:rgba(255,255,255,.06)}
.tgl.on{border-color:rgba(124,58,237,.38);background:rgba(124,58,237,.09)}
.tgl.srch.on{border-color:rgba(96,165,250,.35);background:rgba(96,165,250,.07)}
.tgl-lbl{font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.28);transition:color .16s}
.tgl.on .tgl-lbl{color:#a78bfa}
.tgl.srch.on .tgl-lbl{color:#60a5fa}
.tgl-pill{width:27px;height:15px;border-radius:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.1);position:relative;transition:background .2s}
.tgl.on .tgl-pill{background:rgba(124,58,237,.55)}
.tgl.srch.on .tgl-pill{background:rgba(96,165,250,.5)}
.tgl-thumb{position:absolute;top:1.5px;left:1.5px;width:10px;height:10px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 3px rgba(0,0,0,.3)}
.tgl.on .tgl-thumb,.tgl.srch.on .tgl-thumb{transform:translateX(12px)}
.mdl-btn{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);cursor:pointer;letter-spacing:.03em;transition:all .16s;white-space:nowrap;font-family:'Outfit',sans-serif}
.mdl-btn:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.16)}
.msgs{flex:1;overflow-y:auto;padding:22px 0;display:flex;flex-direction:column}
.msgs::-webkit-scrollbar{width:4px}
.msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.09);border-radius:10px}
.msgs-in{max-width:700px;width:100%;margin:0 auto;padding:0 16px;display:flex;flex-direction:column;gap:15px}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:17px;text-align:center;padding:40px 20px;position:relative;z-index:5}
.e-orb{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#6366f1,#06b6d4);box-shadow:0 0 34px rgba(124,58,237,.5),0 0 70px rgba(99,102,241,.2);animation:orb 3s ease-in-out infinite}
@keyframes orb{0%,100%{transform:scale(1);box-shadow:0 0 34px rgba(124,58,237,.5),0 0 70px rgba(99,102,241,.2)}50%{transform:scale(1.07);box-shadow:0 0 52px rgba(124,58,237,.65),0 0 88px rgba(99,102,241,.3)}}
.e-title{font-size:23px;font-weight:600;background:linear-gradient(135deg,#c4b5fd,#bfdbfe,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.02em}
.e-sub{font-size:13px;color:rgba(255,255,255,.27);max-width:270px;line-height:1.65}
.chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:480px}
.chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:6px 14px;font-family:'Outfit',sans-serif;font-size:12.5px;color:rgba(255,255,255,.42);cursor:pointer;transition:all .16s;white-space:nowrap}
.chip:hover{background:rgba(124,58,237,.13);border-color:rgba(124,58,237,.32);color:#c4b5fd;transform:translateY(-1px)}
.mrow{display:flex;flex-direction:column;gap:4px;animation:mi .22s ease both}
@keyframes mi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.mrow.user{align-items:flex-end}
.mrow.assistant{align-items:flex-start}
.mlbl{font-size:10px;font-weight:600;color:rgba(255,255,255,.2);letter-spacing:.08em;padding:0 12px;text-transform:uppercase}
.mbbl{max-width:83%;border-radius:18px;padding:11px 15px;font-size:14px;line-height:1.72;white-space:pre-wrap;word-break:break-word}
.mrow.user .mbbl{background:linear-gradient(135deg,rgba(124,58,237,.27),rgba(99,102,241,.17));border:1px solid rgba(124,58,237,.3);border-bottom-right-radius:5px;box-shadow:0 4px 18px rgba(124,58,237,.09),inset 0 1px 0 rgba(255,255,255,.06)}
.mrow.assistant .mbbl{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-bottom-left-radius:5px;box-shadow:0 4px 18px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(10px)}
.mimg{max-width:210px;border-radius:10px;margin-bottom:7px;display:block;border:1px solid rgba(255,255,255,.09)}
.fbadge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:4px 9px;font-size:11.5px;color:rgba(255,255,255,.48);margin-bottom:6px}
.cpybtn{background:none;border:none;cursor:pointer;font-size:10.5px;font-weight:500;letter-spacing:.04em;color:rgba(255,255,255,.17);padding:2px 12px;transition:color .13s;font-family:'Outfit',sans-serif}
.cpybtn:hover{color:rgba(255,255,255,.4)}
.cpybtn.ok{color:#6ee7b7}
.typing{display:flex;align-items:flex-start;animation:mi .2s ease both}
.typ-bbl{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:18px;border-bottom-left-radius:5px;padding:12px 15px;display:flex;align-items:center;gap:5px;backdrop-filter:blur(10px)}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.28);animation:tp 1.3s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.17s}.dot:nth-child(3){animation-delay:.34s}
@keyframes tp{0%,60%,100%{opacity:.14;transform:scale(.7)}30%{opacity:1;transform:scale(1)}}
.think-wrap{display:flex;flex-direction:column;gap:7px;animation:mi .2s ease both;max-width:260px}
.think-bar{height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#a78bfa,#6366f1,transparent);background-size:200% 100%;animation:sweep 1.6s ease-in-out infinite}
@keyframes sweep{0%{background-position:200% 0}100%{background-position:-200% 0}}
.think-txt{font-size:11px;color:rgba(167,139,250,.5);letter-spacing:.04em;display:flex;align-items:center;gap:5px}
.th-dot{width:4px;height:4px;border-radius:50%;background:#a78bfa;animation:tp 1.3s ease-in-out infinite}
.th-dot:nth-child(2){animation-delay:.16s}.th-dot:nth-child(3){animation-delay:.32s}
.srch-wrap{display:flex;align-items:center;gap:8px;animation:mi .2s ease both;color:rgba(96,165,250,.6);font-size:12px;padding:2px 0}
.srch-spin{width:14px;height:14px;border:2px solid rgba(96,165,250,.18);border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.err{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:11px 15px;font-size:13px;color:#fca5a5;animation:mi .2s ease both;max-width:83%;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.inp-wrap{position:relative;z-index:10;padding:10px 16px 14px;flex-shrink:0}
.inp-box{max-width:700px;margin:0 auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:18px;backdrop-filter:blur(22px);transition:border-color .2s,box-shadow .2s;box-shadow:0 6px 22px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.05);overflow:hidden}
.inp-box:focus-within{border-color:rgba(124,58,237,.4);box-shadow:0 6px 22px rgba(0,0,0,.22),0 0 0 3px rgba(124,58,237,.07),inset 0 1px 0 rgba(255,255,255,.05)}
.prev-row{display:flex;flex-wrap:wrap;gap:7px;padding:10px 11px 0}
.pimg-w,.pfile-w{position:relative}
.pimg{width:50px;height:50px;object-fit:cover;border-radius:9px;border:1px solid rgba(255,255,255,.09);display:block}
.pfile{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:6px 9px;font-size:11px;color:rgba(255,255,255,.48);max-width:130px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.rm{position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#374151;border:none;cursor:pointer;color:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;transition:background .12s}
.rm:hover{background:#ef4444}
.inr{display:flex;align-items:flex-end;padding:8px 10px}
.att-wrap{position:relative}
.att-btn{width:33px;height:33px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.38);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .16s;flex-shrink:0}
.att-btn:hover{background:rgba(255,255,255,.1);color:rgba(255,255,255,.72)}
.att-popup{position:absolute;bottom:calc(100% + 7px);left:0;background:rgba(12,14,26,.96);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:4px;min-width:145px;box-shadow:0 8px 28px rgba(0,0,0,.5);animation:popIn .15s ease both;z-index:100}
@keyframes popIn{from{opacity:0;transform:translateY(5px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.att-opt{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.62);font-size:13px;font-weight:500;transition:background .12s;border:none;background:none;font-family:'Outfit',sans-serif;width:100%;text-align:left}
.att-opt:hover{background:rgba(255,255,255,.07);color:#fff}
.inr textarea{flex:1;background:none;border:none;outline:none;resize:none;font-family:'Outfit',sans-serif;font-size:14px;color:#e4e6f0;line-height:1.6;min-height:26px;max-height:160px;overflow-y:auto;padding:2px 8px}
.inr textarea::placeholder{color:rgba(255,255,255,.17)}
.send-btn{width:33px;height:33px;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#6366f1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(124,58,237,.3);transition:all .16s}
.send-btn:hover:not(:disabled){background:linear-gradient(135deg,#6d28d9,#4f46e5);transform:scale(1.05)}
.send-btn:disabled{opacity:.24;cursor:not-allowed;transform:none;box-shadow:none}
.inp-hint{text-align:center;margin-top:6px;font-size:10.5px;color:rgba(255,255,255,.11);letter-spacing:.02em}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .17s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:#0b0e1c;border:1px solid rgba(255,255,255,.1);border-radius:20px;width:100%;max-width:520px;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:slideUp .19s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.m-hdr{display:flex;align-items:center;justify-content:space-between;padding:17px 20px 13px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.m-title{font-size:15.5px;font-weight:600}
.m-close{background:none;border:1px solid rgba(255,255,255,.08);border-radius:8px;color:rgba(255,255,255,.38);cursor:pointer;width:29px;height:29px;display:flex;align-items:center;justify-content:center;transition:all .14s}
.m-close:hover{background:rgba(255,255,255,.07);color:#fff}
.m-tabs{display:flex;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;overflow-x:auto;gap:2px}
.m-tab{padding:11px 13px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;border:none;background:none;font-family:'Outfit',sans-serif;color:rgba(255,255,255,.28);transition:color .14s;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.m-tab.on{color:#a78bfa;border-bottom-color:#a78bfa}
.m-tab:hover{color:rgba(255,255,255,.6)}
.m-body{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:18px}
.m-body::-webkit-scrollbar{width:4px}
.m-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.09);border-radius:4px}
.s-sec{display:flex;flex-direction:column;gap:8px}
.s-lbl{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.32);display:flex;align-items:center;gap:5px}
.s-desc{font-size:12px;color:rgba(255,255,255,.28);line-height:1.55;margin-top:-3px}
.s-inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:10px;color:#e4e6f0;font-family:'Outfit',sans-serif;font-size:13.5px;padding:9px 12px;width:100%;outline:none;transition:border-color .16s}
.s-inp:focus{border-color:rgba(124,58,237,.42);background:rgba(255,255,255,.07)}
.s-inp::placeholder{color:rgba(255,255,255,.18)}
.s-ta{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:10px;color:#e4e6f0;font-family:'Outfit',sans-serif;font-size:13px;padding:9px 12px;width:100%;outline:none;transition:border-color .16s;resize:vertical;line-height:1.55}
.s-ta:focus{border-color:rgba(124,58,237,.42)}
.s-ta::placeholder{color:rgba(255,255,255,.18)}
.s-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.s-rr{display:flex;align-items:center;gap:10px}
.s-range{flex:1;accent-color:#7c3aed}
.s-rv{font-size:12.5px;font-weight:600;color:#a78bfa;min-width:38px;text-align:right}
.s-link{font-size:11.5px;color:#7c93f8;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.s-link:hover{color:#a5b4fc;text-decoration:underline}
.s-note{font-size:12px;color:rgba(255,255,255,.28);padding:9px 12px;background:rgba(255,255,255,.03);border-radius:9px;border:1px solid rgba(255,255,255,.07);line-height:1.6}
.api-grid{display:flex;flex-direction:column;gap:5px}
.api-card{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);cursor:pointer;transition:all .15s}
.api-card:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.11)}
.api-card.sel{border-color:rgba(124,58,237,.38);background:rgba(124,58,237,.07)}
.api-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.api-inf{flex:1;min-width:0}
.api-nm{font-size:12.5px;font-weight:600;color:#e4e6f0}
.api-dsc{font-size:11px;color:rgba(255,255,255,.3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.api-bdg{font-size:9.5px;font-weight:700;letter-spacing:.05em;padding:2px 7px;border-radius:10px;border:1px solid;flex-shrink:0;white-space:nowrap}
.api-chk{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .14px;color:#fff}
.api-card.sel .api-chk{background:#7c3aed;border-color:#7c3aed}
.pers-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.pers-card{padding:11px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);cursor:pointer;transition:all .15s}
.pers-card:hover{background:rgba(255,255,255,.05)}
.pers-card.sel{border-color:rgba(124,58,237,.38);background:rgba(124,58,237,.07)}
.pers-nm{font-size:13px;font-weight:600;color:#e4e6f0;margin-bottom:3px}
.pers-dsc{font-size:11px;color:rgba(255,255,255,.32)}
`;

/* ── Chat Item ── */
function ChatItem({chat,active,onSelect,onRename,onFavorite,onDelete,renaming,renameVal,setRenaming,setRenameVal,renameRef}) {
  const start = e => {e.stopPropagation();setRenaming(chat.id);setRenameVal(chat.name);setTimeout(()=>renameRef.current?.focus(),40);};
  const commit = () => {onRename(chat.id,renameVal.trim()||chat.name);setRenaming(null);};
  const onKey = e => {if(e.key==="Enter")commit();if(e.key==="Escape")setRenaming(null);};
  return (
    <div className={`ci ${active?"active":""}`} onClick={onSelect}>
      <button className={`ci-fav ${chat.favorite?"on":""}`} onClick={e=>{e.stopPropagation();onFavorite(chat.id);}}><IStar on={chat.favorite}/></button>
      <div className="ci-icon"><IChat /></div>
      {renaming
        ? <input ref={renameRef} className="ci-rename" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onBlur={commit} onKeyDown={onKey} onClick={e=>e.stopPropagation()}/>
        : <div className="ci-name">{chat.name}</div>
      }
      <div className="ci-acts">
        <button className="ci-act" onClick={start} title="Rename"><IPen /></button>
        <button className="ci-act del" onClick={e=>{e.stopPropagation();onDelete(chat.id);}} title="Delete"><ITrash /></button>
      </div>
    </div>
  );
}

/* ── Settings Modal ── */
function SettingsModal({settings,setSettings,tab,setTab,onClose}) {
  const upd = (k,v) => setSettings(s=>({...s,[k]:v}));
  const setKey = (id,v) => setSettings(s=>({...s,apiKeys:{...s.apiKeys,[id]:v}}));
  const curApi = APIS.find(a=>a.id===settings.apiId)||APIS[0];
  return (
    <div className="ov" onClick={e=>e.target.className==="ov"&&onClose()}>
      <div className="modal">
        <div className="m-hdr">
          <div className="m-title">Settings</div>
          <button className="m-close" onClick={onClose}><IX /></button>
        </div>
        <div className="m-tabs">
          {[["api","API"],["personality","Personality"],["search","Search"],["advanced","Advanced"]].map(([id,lbl])=>(
            <button key={id} className={`m-tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
        <div className="m-body">
          {tab==="api"&&<>
            <div className="s-sec">
              <div className="s-lbl">Choose Model</div>
              <div className="api-grid">
                {APIS.map(api=>(
                  <div key={api.id} className={`api-card ${settings.apiId===api.id?"sel":""}`} onClick={()=>upd("apiId",api.id)}>
                    <div className="api-dot" style={{background:api.color}}/>
                    <div className="api-inf">
                      <div className="api-nm">{api.name}</div>
                      <div className="api-dsc">{api.desc}</div>
                    </div>
                    <div className="api-bdg" style={{borderColor:api.color+"55",color:api.color,background:api.color+"14"}}>{api.badge}</div>
                    <div className="api-chk">{settings.apiId===api.id&&<ICheck />}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="s-sec">
              <div className="s-lbl"><IKey /> Keys</div>
              {curApi.type==="anthropic"&&<>
                <div className="s-note">✓ No key needed — Claude runs via the artifact proxy. Optionally add your own key to use outside this artifact.</div>
                <input className="s-inp" type="password" placeholder="sk-ant-... (optional)" value={settings.apiKeys["claude"]||""} onChange={e=>setKey("claude",e.target.value)}/>
                <a className="s-link" href={curApi.keyUrl} target="_blank" rel="noreferrer">Get Anthropic key ↗</a>
              </>}
              {curApi.type==="openrouter"&&<>
                <div className="s-desc">One key works for all OpenRouter models (DeepSeek, Qwen, Gemini, Llama). Free tier available.</div>
                <input className="s-inp" type="password" placeholder="sk-or-v1-..." value={settings.apiKeys["openrouter"]||""} onChange={e=>setKey("openrouter",e.target.value)}/>
                <a className="s-link" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">Get free OpenRouter key ↗</a>
              </>}
              {curApi.type==="custom"&&<>
                <input className="s-inp" placeholder="https://your-api.com/v1/chat/completions" value={settings.customEndpoint} onChange={e=>upd("customEndpoint",e.target.value)}/>
                <div className="s-row">
                  <input className="s-inp" placeholder="Model (e.g. gpt-4)" value={settings.customModel} onChange={e=>upd("customModel",e.target.value)}/>
                  <input className="s-inp" type="password" placeholder="API key (optional)" value={settings.apiKeys["custom"]||""} onChange={e=>setKey("custom",e.target.value)}/>
                </div>
              </>}
            </div>
          </>}
          {tab==="personality"&&<>
            <div className="s-sec">
              <div className="s-lbl">AI Personality</div>
              <div className="s-desc">Sets how Nexus behaves and communicates.</div>
              <div className="pers-grid">
                {PERSONALITIES.map(p=>(
                  <div key={p.id} className={`pers-card ${settings.personality===p.id?"sel":""}`} onClick={()=>upd("personality",p.id)}>
                    <div className="pers-nm">{p.name}</div>
                    <div className="pers-dsc">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="s-sec">
              <div className="s-lbl">System Prompt Override</div>
              <div className="s-desc">Fully replaces the personality above. Leave blank to use selected personality.</div>
              <textarea className="s-ta" rows={4} placeholder="You are a custom AI assistant..." value={settings.sysOverride} onChange={e=>upd("sysOverride",e.target.value)}/>
            </div>
          </>}
          {tab==="search"&&<>
            <div className="s-sec">
              <div className="s-lbl"><ISearch /> Web Search</div>
              <div className="s-desc">Claude uses built-in search natively. For other models, add a Tavily key (free: 1,000 searches/month, no credit card).</div>
              <input className="s-inp" type="password" placeholder="tvly-..." value={settings.tavilyKey} onChange={e=>upd("tavilyKey",e.target.value)}/>
              <a className="s-link" href="https://app.tavily.com" target="_blank" rel="noreferrer">Get free Tavily key ↗</a>
            </div>
            <div className="s-note">🔍 Toggle Search in the header to enable web search. Claude searches natively; other models use Tavily to inject live results into the context.</div>
          </>}
          {tab==="advanced"&&<>
            <div className="s-sec">
              <div className="s-lbl">Temperature</div>
              <div className="s-desc">Higher = more creative. Lower = more focused and deterministic.</div>
              <div className="s-rr">
                <input type="range" className="s-range" min="0" max="1" step="0.05" value={settings.temperature} onChange={e=>upd("temperature",parseFloat(e.target.value))}/>
                <div className="s-rv">{settings.temperature.toFixed(2)}</div>
              </div>
            </div>
            <div className="s-sec">
              <div className="s-lbl">Max Tokens</div>
              <div className="s-desc">Maximum length of the AI response.</div>
              <div className="s-rr">
                <input type="range" className="s-range" min="256" max="8000" step="256" value={settings.maxTokens} onChange={e=>upd("maxTokens",parseInt(e.target.value))}/>
                <div className="s-rv">{settings.maxTokens}</div>
              </div>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [settings, setSettings] = useState(DEF);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("api");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [adaptive, setAdaptive] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [ready, setReady] = useState(false);

  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);
  const renameRef = useRef(null);
  const attachWrap = useRef(null);

  const activeChat = chats.find(c=>c.id===activeId);
  const messages = activeChat?.messages||[];
  const isEmpty = messages.length===0&&!loading;
  const canSend = (input.trim()||attachments.length>0)&&!loading;
  const curApi = APIS.find(a=>a.id===settings.apiId)||APIS[0];

  useEffect(()=>{
    const el=document.createElement("style");el.textContent=CSS;document.head.appendChild(el);
    return ()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    (async()=>{
      try {
        const [cr,sr]=await Promise.all([
          window.storage.get("nx-chats").catch(()=>null),
          window.storage.get("nx-settings").catch(()=>null),
        ]);
        if(cr?.value){const s=JSON.parse(cr.value);if(s.length){setChats(s);setActiveId(s[0].id);}}
        if(sr?.value){setSettings(p=>({...p,...JSON.parse(sr.value)}));}
      }catch(e){console.error(e);}
      setReady(true);
    })();
  },[]);

  useEffect(()=>{if(ready&&chats.length===0)createChat();},[ready]);

  useEffect(()=>{
    if(!ready)return;
    window.storage.set("nx-chats",JSON.stringify(chats)).catch(()=>{});
  },[chats,ready]);

  useEffect(()=>{
    if(!ready)return;
    window.storage.set("nx-settings",JSON.stringify(settings)).catch(()=>{});
  },[settings,ready]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);

  useEffect(()=>{
    if(!showAttach)return;
    const h=e=>{if(attachWrap.current&&!attachWrap.current.contains(e.target))setShowAttach(false);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[showAttach]);

  const createChat = () => {
    const c={id:uid(),name:"New Chat",messages:[],favorite:false,createdAt:Date.now()};
    setChats(p=>[c,...p]);setActiveId(c.id);setError(null);setInput("");setAttachments([]);
  };

  const setMessages = updater => {
    setChats(p=>p.map(c=>c.id===activeId?{...c,messages:typeof updater==="function"?updater(c.messages):updater}:c));
  };

  const renameChat = (id,name)=>setChats(p=>p.map(c=>c.id===id?{...c,name:name||"Chat"}:c));
  const toggleFav = id=>setChats(p=>p.map(c=>c.id===id?{...c,favorite:!c.favorite}:c));
  const deleteChat = id=>{
    setChats(p=>{
      const next=p.filter(c=>c.id!==id);
      if(id===activeId){
        if(next.length>0)setActiveId(next[0].id);
        else{const c={id:uid(),name:"New Chat",messages:[],favorite:false,createdAt:Date.now()};setTimeout(()=>{setChats([c]);setActiveId(c.id);},0);}
      }
      return next;
    });
  };

  const resize = ()=>{const el=taRef.current;if(!el)return;el.style.height="auto";el.style.height=Math.min(el.scrollHeight,160)+"px";};

  const handleFiles = async (files,imagesOnly=false)=>{
    setShowAttach(false);
    const list=Array.from(files),out=[];
    for(const f of list){
      if(IMG_TYPES.includes(f.type)){const b=await toB64(f);out.push({type:"image",name:f.name,dataUrl:`data:${f.type};base64,${b}`,base64:b,mimeType:f.type});}
      else if(!imagesOnly){const t=await toTxt(f).catch(()=>"[unreadable]");out.push({type:"file",name:f.name,text:t});}
    }
    setAttachments(p=>[...p,...out]);
  };

  const buildContent = (text,atts)=>{
    if(!atts.length)return text||" ";
    const parts=[];let full=text;
    atts.filter(a=>a.type==="file").forEach(a=>{full+=`\n\n[File: ${a.name}]\n${a.text}`;});
    if(full.trim())parts.push({type:"text",text:full.trim()});
    atts.filter(a=>a.type==="image").forEach(a=>{parts.push({type:"image",source:{type:"base64",media_type:a.mimeType,data:a.base64}});});
    if(!parts.length)return " ";
    return parts.length===1&&parts[0].type==="text"?parts[0].text:parts;
  };

  const tavilySearch = async query=>{
    if(!settings.tavilyKey)return null;
    try{
      const r=await fetch("https://api.tavily.com/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:settings.tavilyKey,query,max_results:5,search_depth:"basic"})});
      const d=await r.json();
      if(!d.results?.length)return null;
      return d.results.map((r,i)=>`${i+1}. **${r.title}**\n   ${r.url}\n   ${r.content?.slice(0,300)}...`).join("\n\n");
    }catch{return null;}
  };

  const send = useCallback(async overrideText=>{
    const txt=(overrideText??input).trim();
    if((!txt&&!attachments.length)||loading)return;
    const content=buildContent(txt,attachments);
    const userMsg={role:"user",displayText:txt,images:attachments.filter(a=>a.type==="image").map(a=>a.dataUrl),files:attachments.filter(a=>a.type==="file").map(a=>a.name),content};
    if(messages.length===0&&activeChat?.name==="New Chat")renameChat(activeId,trunc(txt,32));
    const next=[...messages,userMsg];
    setMessages(next);setInput("");setAttachments([]);
    if(taRef.current)taRef.current.style.height="auto";
    setLoading(true);setError(null);
    try{
      const api=curApi;
      const sys=settings.sysOverride||(SYS[settings.personality]||SYS.assistant);
      const apiMsgs=next.map(m=>({role:m.role,content:m.content}));
      let reply="";

      if(api.type==="anthropic"){
        const key=settings.apiKeys["claude"]||"";
        const headers={"Content-Type":"application/json","anthropic-version":"2023-06-01"};
        if(key)headers["x-api-key"]=key;
        const betas=[];
        if(adaptive&&api.supportsThinking)betas.push("interleaved-thinking-2025-05-14");
        if(searchMode&&api.supportsNativeSearch)betas.push("web-search-2025-03-05");
        if(betas.length)headers["anthropic-beta"]=betas.join(",");
        const body={model:api.model,system:sys,messages:apiMsgs,max_tokens:adaptive?12000:settings.maxTokens};
        if(!adaptive)body.temperature=settings.temperature;
        if(adaptive&&api.supportsThinking)body.thinking={type:"enabled",budget_tokens:8000};
        if(searchMode&&api.supportsNativeSearch)body.tools=[{type:"web_search_20250305",name:"web_search"}];
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,body:JSON.stringify(body)});
        const data=await res.json();
        if(!res.ok||data.error){
          const err=data.error||data;
          if(err.type==="exceeded_limit"||err.type==="rate_limit_error"){
            const ra=err.resetsAt??err.windows?.["5h"]?.resets_at;
            if(ra){const mins=Math.ceil((ra*1000-Date.now())/60000);const hrs=Math.floor(mins/60);throw new Error(`Rate limit reached. Resets in ~${hrs>0?`${hrs}h ${mins%60}m`:`${mins}m`}.`);}
            throw new Error("Rate limit reached. Please wait before sending more messages.");
          }
          throw new Error(err.message||`API error ${res.status}`);
        }
        reply=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"(no response)";

      } else if(api.type==="openrouter"){
        const key=settings.apiKeys["openrouter"];
        if(!key)throw new Error("No OpenRouter key set.\nAdd one in Settings → API.\nGet a free key at openrouter.ai/keys");
        let sysFull=sys;
        if(searchMode){
          if(!settings.tavilyKey)sysFull+="\n\n[Search mode is on but no Tavily key is configured. Add one in Settings → Search.]";
          else{setSearching(true);const results=await tavilySearch(txt);setSearching(false);if(results)sysFull+=`\n\n[WEB SEARCH RESULTS for: "${txt}"]\n${results}\n[END RESULTS]\nUse these results to inform your answer where relevant.`;}
        }
        const orMsgs=[{role:"system",content:sysFull},...apiMsgs.map(m=>({role:m.role,content:toOpenAI(m.content)}))];
        const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"HTTP-Referer":"https://claude.ai","X-Title":"Nexus AI"},body:JSON.stringify({model:api.model,messages:orMsgs,max_tokens:settings.maxTokens,temperature:settings.temperature})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||`API error ${res.status}: ${data.error?.code||""}`);
        reply=data.choices?.[0]?.message?.content||"(no response)";

      } else if(api.type==="custom"){
        if(!settings.customEndpoint)throw new Error("No custom endpoint set. Configure it in Settings → API.");
        const key=settings.apiKeys["custom"]||"";
        let sysFull=sys;
        if(searchMode&&settings.tavilyKey){setSearching(true);const r=await tavilySearch(txt);setSearching(false);if(r)sysFull+=`\n\n[SEARCH]\n${r}\n[/SEARCH]`;}
        const headers={"Content-Type":"application/json"};
        if(key)headers["Authorization"]=`Bearer ${key}`;
        const res=await fetch(settings.customEndpoint,{method:"POST",headers,body:JSON.stringify({model:settings.customModel||"gpt-4",messages:[{role:"system",content:sysFull},...apiMsgs.map(m=>({role:m.role,content:toOpenAI(m.content)}))],max_tokens:settings.maxTokens,temperature:settings.temperature})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||`API error ${res.status}`);
        reply=data.choices?.[0]?.message?.content||"(no response)";
      }

      setMessages(p=>[...p,{role:"assistant",displayText:reply,images:[],files:[],content:reply}]);
    }catch(e){setError(e.message||"Something went wrong.");}
    finally{setLoading(false);setSearching(false);}
  },[input,attachments,messages,loading,adaptive,searchMode,settings,activeId,curApi,activeChat]);

  const handleKey = e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  const copyMsg = (text,i)=>{navigator.clipboard.writeText(text).then(()=>{setCopied(i);setTimeout(()=>setCopied(null),1800);});};

  const favChats = chats.filter(c=>c.favorite);
  const regChats = chats.filter(c=>!c.favorite);

  return (
    <div className="app">
      <div className="sf">{STARS.map(s=><div key={s.id} className="st" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.sz,height:s.sz,"--dx":`${s.dx}px`,"--dy":`${s.dy}px`,animation:`tw ${s.td}s ${s.tde}s ease-in-out infinite,dr ${s.dd}s ${s.dde}s ease-in-out infinite`}}/>)}</div>
      <div className="gl gl-a"/><div className="gl gl-b"/>

      <div className={`sb ${sidebarOpen?"":"closed"}`}>
        <div className="sb-top">
          <div className="sb-logo">NEXUS</div>
          <button className="new-btn" onClick={createChat}><IPlus /> New Chat</button>
        </div>
        <div className="chat-list">
          {favChats.length>0&&<>
            <div className="sec-lbl">Favorites</div>
            {favChats.map(c=><ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={()=>{setActiveId(c.id);setError(null);}} onRename={renameChat} onFavorite={toggleFav} onDelete={deleteChat} renaming={renamingId===c.id} renameVal={renameVal} setRenaming={setRenamingId} setRenameVal={setRenameVal} renameRef={renameRef}/>)}
            {regChats.length>0&&<div className="sec-lbl">Chats</div>}
          </>}
          {regChats.map(c=><ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={()=>{setActiveId(c.id);setError(null);}} onRename={renameChat} onFavorite={toggleFav} onDelete={deleteChat} renaming={renamingId===c.id} renameVal={renameVal} setRenaming={setRenamingId} setRenameVal={setRenameVal} renameRef={renameRef}/>)}
        </div>
        <div className="sb-bot">
          <button className="sb-set" onClick={()=>{setShowSettings(true);setSettingsTab("api");}}><IGear /> Settings</button>
        </div>
      </div>

      <div className="main">
        <div className="hdr">
          <button className="hdr-menu" onClick={()=>setSidebarOpen(v=>!v)}><IMenu /></button>
          <div className="hdr-title">{activeChat?.name||"Nexus"}</div>
          <div className="hdr-r">
            {curApi.supportsThinking&&(
              <div className={`tgl ${adaptive?"on":""}`} onClick={()=>setAdaptive(v=>!v)}>
                <div className="tgl-lbl">Think</div>
                <div className="tgl-pill"><div className="tgl-thumb"/></div>
              </div>
            )}
            <div className={`tgl srch ${searchMode?"on":""}`} onClick={()=>setSearchMode(v=>!v)}>
              <div className="tgl-lbl">Search</div>
              <div className="tgl-pill"><div className="tgl-thumb"/></div>
            </div>
            <button className="mdl-btn" style={{color:curApi.color}} onClick={()=>{setShowSettings(true);setSettingsTab("api");}}>
              {curApi.name}
            </button>
          </div>
        </div>

        {isEmpty?(
          <div className="empty">
            <div className="e-orb"/>
            <div className="e-title">What can I help with?</div>
            <div className="e-sub">Code, scripts, files, images — ask anything.</div>
            <div className="chips">{PROMPTS.map(p=><button key={p} className="chip" onClick={()=>send(p)}>{p}</button>)}</div>
          </div>
        ):(
          <div className="msgs">
            <div className="msgs-in">
              {messages.map((msg,i)=>(
                <div key={i} className={`mrow ${msg.role}`}>
                  <div className="mlbl">{msg.role==="user"?"You":"Nexus"}</div>
                  <div className="mbbl">
                    {msg.images?.map((src,j)=><img key={j} src={src} className="mimg" alt=""/>)}
                    {msg.files?.map((n,j)=><div key={j} className="fbadge"><IFile /> {n}</div>)}
                    {msg.displayText}
                  </div>
                  {msg.role==="assistant"&&(
                    <button className={`cpybtn ${copied===i?"ok":""}`} onClick={()=>copyMsg(msg.displayText,i)}>
                      {copied===i?"✓ copied":"copy"}
                    </button>
                  )}
                </div>
              ))}

              {loading&&(searching?(
                <div className="srch-wrap"><div className="srch-spin"/><ISearch /> Searching the web…</div>
              ):adaptive&&curApi.supportsThinking?(
                <div className="think-wrap">
                  <div className="think-txt"><div className="th-dot"/><div className="th-dot"/><div className="th-dot"/> Thinking deeply…</div>
                  <div className="think-bar" style={{width:"200px"}}/>
                </div>
              ):(
                <div className="typing"><div className="typ-bbl"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>
              ))}

              {error&&<div className="err">{error}</div>}
              <div ref={bottomRef}/>
            </div>
          </div>
        )}

        <input ref={imgRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>{handleFiles(e.target.files,true);e.target.value="";}}/>
        <input ref={fileRef} type="file" multiple accept=".txt,.js,.ts,.lua,.py,.json,.md,.csv,.html,.css,.xml,.yaml,.toml,.c,.cpp,.h" style={{display:"none"}} onChange={e=>{handleFiles(e.target.files,false);e.target.value="";}}/>

        <div className="inp-wrap">
          <div className="inp-box">
            {attachments.length>0&&(
              <div className="prev-row">
                {attachments.map((a,i)=>a.type==="image"?(
                  <div key={i} className="pimg-w"><img src={a.dataUrl} className="pimg" alt={a.name}/><button className="rm" onClick={()=>setAttachments(p=>p.filter((_,j)=>j!==i))}><IX /></button></div>
                ):(
                  <div key={i} className="pfile-w"><div className="pfile"><IFile /> {a.name}</div><button className="rm" onClick={()=>setAttachments(p=>p.filter((_,j)=>j!==i))}><IX /></button></div>
                ))}
              </div>
            )}
            <div className="inr">
              <div className="att-wrap" ref={attachWrap}>
                <button className="att-btn" onClick={()=>setShowAttach(v=>!v)}><IPlus /></button>
                {showAttach&&(
                  <div className="att-popup">
                    <button className="att-opt" onClick={()=>{imgRef.current?.click();}}><IImg /> Photos</button>
                    <button className="att-opt" onClick={()=>{fileRef.current?.click();}}><IFile /> Files</button>
                  </div>
                )}
              </div>
              <textarea ref={taRef} placeholder="Message Nexus…" value={input} rows={1} disabled={loading} onChange={e=>{setInput(e.target.value);resize();}} onKeyDown={handleKey}/>
              <button className="send-btn" disabled={!canSend} onClick={()=>send()}><ISend /></button>
            </div>
          </div>
          <div className="inp-hint">Enter to send · Shift+Enter for new line</div>
        </div>
      </div>

      {showSettings&&<SettingsModal settings={settings} setSettings={setSettings} tab={settingsTab} setTab={setSettingsTab} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}
