'use client';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';

export const columns = ['Backlog','To do','In progress','In review','Done'];
export type Priority = 'Low'|'Medium'|'High'|'Urgent';
export type Task = {id:string;boardId:string;title:string;description:string;column:string;priority:Priority;due:string;assignee:string;label:string;created:number;subtasks:{title:string;done:boolean}[]};
export type Board = {id:string;name:string;description:string;color:string;icon:string;owned:boolean;updated:number};
type Workspace = {boards:Board[];tasks:Task[];profile:{name:string;email:string};recent:string[];collapsed:boolean};
const day=(offset:number)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const today=()=>day(0);
function initial():Workspace {
 const boards:Board[]=[
 {id:'website',name:'Website redesign',description:'A fresh experience for our next chapter.',color:'mint',icon:'Globe',owned:true,updated:4},
 {id:'product',name:'Product launch',description:'From the first idea to launch day.',color:'purple',icon:'Rocket',owned:true,updated:3},
 {id:'design',name:'Design system',description:'One consistent language for everything we build.',color:'peach',icon:'Shapes',owned:false,updated:2},
 {id:'mobile',name:'Mobile experience',description:'Thoughtful interactions, wherever you are.',color:'blue',icon:'Smartphone',owned:false,updated:1}
 ];
 const titles=[['Map the new user journey','Explore homepage directions','Build responsive navigation','Design the dashboard experience','Review accessibility checklist','Set up project foundations'],['Define launch milestones','Write the product story','Build the waitlist page','Review launch assets','Prepare the launch checklist'],['Audit existing components','Create color primitives','Build button variants','Document typography','Publish icon guidelines'],['Explore onboarding flow','Design task detail sheet','Prototype navigation','Review touch targets']];
 const tasks:Task[]=boards.flatMap((b,bi)=>titles[bi].map((title,i)=>({id:`${b.id}-${i}`,boardId:b.id,title,description:'Create a thoughtful, accessible experience. Document the decisions and share the result with the team for review.',column:columns[(i+bi)%5],priority:(['Medium','High','Low','High','Medium'] as Priority[])[i%5],due:day(i-1),assignee:i%3===0?'Maya Chen':'Anton Epson',label:i%2?'Design':'Development',created:Date.now()-i*86400000,subtasks:[{title:'Define acceptance criteria',done:i%2===0},{title:'Share for review',done:false}]})));
 return {boards,tasks,profile:{name:'Anton Epson',email:'anton@example.com'},recent:['website','product','design'],collapsed:false};
}
const slice=createSlice({name:'workspace',initialState:initial(),reducers:{
 hydrate:(_,a:PayloadAction<Workspace>)=>a.payload,
 addBoard:(s,a:PayloadAction<Board>)=>{s.boards.push(a.payload)},
 saveTask:(s,a:PayloadAction<Task>)=>{const i=s.tasks.findIndex(t=>t.id===a.payload.id);if(i<0)s.tasks.push(a.payload);else s.tasks[i]=a.payload},
 moveTask:(s,a:PayloadAction<{id:string;column:string}>)=>{const t=s.tasks.find(t=>t.id===a.payload.id);if(t)t.column=a.payload.column},
 visit:(s,a:PayloadAction<string>)=>{s.recent=[a.payload,...s.recent.filter(id=>id!==a.payload)].slice(0,6)},
 profile:(s,a:PayloadAction<Workspace['profile']>)=>{const old=s.profile.name;s.profile=a.payload;s.tasks.forEach(t=>{if(t.assignee===old)t.assignee=a.payload.name})},
 collapse:(s)=>{s.collapsed=!s.collapsed}
}});
export const actions=slice.actions;
const makeStore=()=>configureStore({reducer:slice.reducer});
type Store=ReturnType<typeof makeStore>;
export const useWorkspace=()=>useSelector((s:Workspace)=>s);
export const useAppDispatch=useDispatch.withTypes<Store['dispatch']>();
export function WorkspaceProvider({children}:{children:React.ReactNode}){
 const ref=useRef<Store|null>(null);if(!ref.current)ref.current=makeStore();
 useEffect(()=>{const store=ref.current!;try{const raw=localStorage.getItem('constrack-v1');if(raw){const s=JSON.parse(raw);if(Array.isArray(s.boards)&&Array.isArray(s.tasks)&&s.profile&&Array.isArray(s.recent))store.dispatch(actions.hydrate(s))}}catch{}
 return store.subscribe(()=>{try{localStorage.setItem('constrack-v1',JSON.stringify(store.getState()))}catch{}})},[]);
 return <Provider store={ref.current}>{children}</Provider>;
}
