import { useEffect, useId, useRef, useState } from "react";
import { infrastructureAssets as assets } from "../../pages/Infrastructure/assets";
type Props={label:string;value:string;options:string[];onChange:(value:string)=>void;review?:boolean;disabled?:boolean};
export default function InfrastructureSelect({label,value,options,onChange,review=false,disabled=false}:Props){
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);const ref=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),id=useId();
  useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};window.addEventListener("pointerdown",close);return()=>window.removeEventListener("pointerdown",close);},[open]);
  function choose(i:number){onChange(options[i]);setOpen(false);button.current?.focus();}
  return <div ref={ref} className="relative min-w-0"><button type="button" ref={button} role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" aria-activedescendant={open?id+active:undefined} disabled={disabled}
    onBlur={e=>{if(!ref.current?.contains(e.relatedTarget as Node))setOpen(false);}} onClick={()=>{setActive(Math.max(0,options.indexOf(value)));setOpen(v=>!v);}}
    onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);e.stopPropagation();}if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){e.preventDefault();setOpen(true);setActive(i=>e.key==="Home"?0:e.key==="End"?options.length-1:(i+(e.key==="ArrowDown"?1:-1)+options.length)%options.length);}if(open&&["Enter"," "].includes(e.key)){e.preventDefault();choose(active);}if(e.key==="Tab")setOpen(false);}}
    className={"flex w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-white px-[14px] text-left text-sm leading-[21px] disabled:bg-[#f4f5f6] "+(review?"h-[46px] border-[#234f73]":"h-12 border-[#c8d0d7]")}><span className="truncate">{value}</span>{review?<span aria-hidden="true">⌄</span>:<img src={assets.chevron} alt="" width={16} height={16} className="shrink-0"/>}</button>
    {open&&<div id={id} role="listbox" aria-label={label} className={"absolute top-[calc(100%_+_4px)] left-0 z-40 overflow-y-auto rounded-md border border-[#c8d0d7] bg-white "+(review?"h-[73px] w-[200px] shadow-[0_4px_12px_rgba(20,38,56,0.14)]":"flex max-h-[350px] w-60 flex-col gap-3 p-[23px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]")}>
      {options.map((option,i)=><div key={option} id={id+i} role="option" aria-selected={value===option} onMouseDown={e=>e.preventDefault()} onPointerMove={()=>setActive(i)} onClick={()=>choose(i)} className={(review?"flex h-[35.5px] shrink-0 items-center px-3 text-[13px] leading-5 ":"flex min-h-10 shrink-0 cursor-pointer items-center rounded-md border border-[#cbd5e1] px-[15px] text-sm font-bold leading-[22px] ")+((active===i||value===option)?"bg-[#eef3f7]":"bg-white")}>{option}</div>)}
    </div>}
  </div>;
}
