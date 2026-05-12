import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

/* ── Stars ── */
const STARS = Array.from({length:55},(_,i)=>({
  id:i,x:Math.random()*100,y:Math.random()*100,sz:Math.random()*1.4+.3,
  td:(Math.random()*3+2).toFixed(2),tde:(Math.random()*6).toFixed(2),
  dx:((Math.random()-.5)*28).toFixed(1),dy:((Math.random()-.5)*28).toFixed(1),
  dd:(Math.random()*20+12).toFixed(1),dde:(Math.random()*-18).toFixed(1),
}));

/* ── API Providers ── */
const APIS = [
  {id:"claude",name:"Claude Sonnet 4",badge:"Default",type:"openrouter",
   model:"anthropic/claude-sonnet-4",color:"#a78bfa",
   desc:"Best overall. Excellent at coding, reasoning, and following instructions."},
  {id:"gemini-flash",name:"Gemini 2.5 Flash",badge:"Free",type:"google",
   model:"gemini-2.5-flash-preview-05-20",color:"#fbbf24",
   keyUrl:"https://aistudio.google.com/apikey",
   desc:"Google's fastest model. Huge context window, great reasoning."},
  {id:"gemini-pro",name:"Gemini 2.5 Pro",badge:"Free",type:"google",
   model:"gemini-2.5-pro-preview-06-05",color:"#fb923c",
   keyUrl:"https://aistudio.google.com/apikey",
   desc:"Google's most capable model. Best for hard problems and long docs."},
  {id:"llama-groq",name:"Llama 3.3 70B",badge:"Free · Fast",type:"groq",
   model:"llama-3.3-70b-versatile",color:"#f472b6",
   keyUrl:"https://console.groq.com/keys",
   desc:"Meta's flagship on Groq's ultra-fast hardware. Blazing inference speed."},
  {id:"deepseek-groq",name:"DeepSeek R1",badge:"Free · Think",type:"groq",
   model:"deepseek-r1-distill-llama-70b",color:"#60a5fa",
   keyUrl:"https://console.groq.com/keys",
   desc:"DeepSeek's reasoning model on Groq. Great for hard coding problems."},
  {id:"deepseek-or",name:"DeepSeek V3",badge:"OpenRouter",type:"openrouter",
   model:"deepseek/deepseek-chat-v3-0324",color:"#34d399",
   keyUrl:"https://openrouter.ai/keys",
   desc:"DeepSeek's latest via OpenRouter. Excellent at coding and analysis."},
  {id:"qwen-or",name:"Qwen 3 Coder",badge:"OpenRouter",type:"openrouter",
   model:"qwen/qwen3-coder",color:"#a78bfa",
   keyUrl:"https://openrouter.ai/keys",
   desc:"Qwen's coding-focused model via OpenRouter. Strong at Lua and Python."},
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
          {[["api","Models"],["personality","Personality"],["search","Search"],["advanced","Advanced"]].map(([id,lbl])=>(
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
              {curApi.type==="google"&&<>
                <div className="s-desc">Free Google AI Studio key. No credit card. Generous free tier.</div>
                <input className="s-inp" type="password" placeholder="AIza..." value={settings.apiKeys["google"]||""} onChange={e=>setKey("google",e.target.value)}/>
                <a className="s-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">→ Get free Google AI Studio key</a>
              </>}
              {curApi.type==="groq"&&<>
                <div className="s-desc">Free Groq key. The fastest free AI inference available. No credit card needed.</div>
                <input className="s-inp" type="password" placeholder="gsk_..." value={settings.apiKeys["groq"]||""} onChange={e=>setKey("groq",e.target.value)}/>
                <a className="s-link" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">→ Get free Groq key</a>
              </>}
              {curApi.type==="openrouter"&&<>
                <div className="s-desc">Free OpenRouter key. One key works for all OpenRouter models.</div>
                <input className="s-inp" type="password" placeholder="sk-or-v1-..." value={settings.apiKeys["openrouter"]||""} onChange={e=>setKey("openrouter",e.target.value)}/>
                <a className="s-link" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">→ Get free OpenRouter key</a>
              </>}
              {curApi.type==="custom"&&<>
                <input className="s-inp" placeholder="Endpoint URL (e.g. https://api.openai.com/v1/chat/completions)" value={settings.customEndpoint} onChange={e=>upd("customEndpoint",e.target.value)}/>
                <div className="s-row">
                  <input className="s-inp" placeholder="Model name (e.g. gpt-4o)" value={settings.customModel} onChange={e=>upd("customModel",e.target.value)}/>
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
    try {
      const cr=localStorage.getItem("nx-chats");
      const sr=localStorage.getItem("nx-settings");
      if(cr){const s=JSON.parse(cr);if(s.length){setChats(s);setActiveId(s[0].id);}}
      if(sr){setSettings(p=>({...p,...JSON.parse(sr)}));}
    }catch(e){console.error(e);}
    setReady(true);
  },[]);

  useEffect(()=>{if(ready&&chats.length===0)createChat();},[ready]);

  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem("nx-chats",JSON.stringify(chats));}catch(e){}
  },[chats,ready]);

  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem("nx-settings",JSON.stringify(settings));}catch(e){}
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

      if(api.type==="google"){
        const key=settings.apiKeys["google"];
        if(!key)throw new Error("no_google_key");
        let sysFull=sys;
        if(searchMode&&settings.tavilyKey){setSearching(true);const r=await tavilySearch(txt);setSearching(false);if(r)sysFull+=`\n\n[SEARCH RESULTS]\n${r}\n[/SEARCH RESULTS]`;}
        const msgs=[{role:"system",content:sysFull},...apiMsgs.map(m=>({role:m.role,content:toOpenAI(m.content)}))];
        const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model:api.model,messages:msgs,max_tokens:settings.maxTokens,temperature:settings.temperature})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||`Google API error ${res.status}`);
        reply=data.choices?.[0]?.message?.content||"(no response)";

      } else if(api.type==="groq"){
        const key=settings.apiKeys["groq"];
        if(!key)throw new Error("no_groq_key");
        let sysFull=sys;
        if(searchMode&&settings.tavilyKey){setSearching(true);const r=await tavilySearch(txt);setSearching(false);if(r)sysFull+=`\n\n[SEARCH RESULTS]\n${r}\n[/SEARCH RESULTS]`;}
        const msgs=[{role:"system",content:sysFull},...apiMsgs.map(m=>({role:m.role,content:toOpenAI(m.content)}))];
        const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model:api.model,messages:msgs,max_tokens:settings.maxTokens,temperature:settings.temperature})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||`Groq API error ${res.status}`);
        reply=data.choices?.[0]?.message?.content||"(no response)";

      } else if(api.type==="openrouter"){
        const key=settings.apiKeys["openrouter"];
        if(!key)throw new Error("no_openrouter_key");
        let sysFull=sys;
        if(searchMode&&settings.tavilyKey){setSearching(true);const results=await tavilySearch(txt);setSearching(false);if(results)sysFull+=`\n\n[SEARCH RESULTS]\n${results}\n[/SEARCH RESULTS]`;}
        const orMsgs=[{role:"system",content:sysFull},...apiMsgs.map(m=>({role:m.role,content:toOpenAI(m.content)}))];
        const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"X-Title":"Nexus AI"},body:JSON.stringify({model:api.model,messages:orMsgs,max_tokens:settings.maxTokens,temperature:settings.temperature})});
        const data=await res.json();
        if(!res.ok||data.error)throw new Error(data.error?.message||`OpenRouter error ${res.status}: ${data.error?.code||""}`);
        reply=data.choices?.[0]?.message?.content||"(no response)";

      } else if(api.type==="custom"){
        if(!settings.customEndpoint)throw new Error("No custom endpoint set. Configure it in Settings → Models.");
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
            {favChats.map(c=><ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={()=>{setActiveId(c.id);setError(null);setSidebarOpen(false);}} onRename={renameChat} onFavorite={toggleFav} onDelete={deleteChat} renaming={renamingId===c.id} renameVal={renameVal} setRenaming={setRenamingId} setRenameVal={setRenameVal} renameRef={renameRef}/>)}
            {regChats.length>0&&<div className="sec-lbl">Chats</div>}
          </>}
          {regChats.map(c=><ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={()=>{setActiveId(c.id);setError(null);setSidebarOpen(false);}} onRename={renameChat} onFavorite={toggleFav} onDelete={deleteChat} renaming={renamingId===c.id} renameVal={renameVal} setRenaming={setRenamingId} setRenameVal={setRenameVal} renameRef={renameRef}/>)}
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

              {error&&(["no_openrouter_key","no_google_key","no_groq_key"].includes(error)?(()=>{
                const cfg={
                  no_google_key:{emoji:"🔑",name:"Google AI Studio",url:"https://aistudio.google.com/apikey",label:"Get free Google AI key"},
                  no_groq_key:{emoji:"⚡",name:"Groq",url:"https://console.groq.com/keys",label:"Get free Groq key"},
                  no_openrouter_key:{emoji:"🔑",name:"OpenRouter",url:"https://openrouter.ai/keys",label:"Get free OpenRouter key (required for all models)"},
                }[error];
                return (
                  <div className="err" style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                    <div>{cfg.emoji} <strong>{cfg.name} key required</strong> for {curApi.name}.</div>
                    <div style={{fontSize:"12px",opacity:.8}}>Free, no credit card needed. Paste your key in Settings → Models.</div>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      <a href={cfg.url} target="_blank" rel="noreferrer" style={{background:"rgba(96,165,250,.15)",border:"1px solid rgba(96,165,250,.35)",borderRadius:"8px",padding:"6px 13px",color:"#93c5fd",fontSize:"12px",fontWeight:600,textDecoration:"none"}}>{cfg.label} ↗</a>
                      <button onClick={()=>{setShowSettings(true);setSettingsTab("api");setError(null);}} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.15)",borderRadius:"8px",padding:"6px 13px",color:"rgba(255,255,255,.7)",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>Open Settings</button>
                    </div>
                  </div>
                );
              })():(
                <div className="err">{error}</div>
              ))}
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
