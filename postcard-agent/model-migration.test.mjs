import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./PostcardAgent.gs',import.meta.url),'utf8');
function context(model) {
 const ctx=vm.createContext({});vm.runInContext(source,ctx);
 ctx.pcProps_=()=>({getProperty:key=>key==='PC_MODEL'?model:null});return ctx;
}
test('default uses the replacement model',()=>assert.equal(context(null).pcModel_(),'gpt-6.1-terra'));
test('retired aliases cannot override the replacement',()=>{
 for(const value of ['gpt-5-mini','gpt-5-mini-2025-08-07',' gpt-5-mini '])assert.equal(context(value).pcModel_(),'gpt-6.1-terra');
});
test('a deliberately configured different model is preserved',()=>assert.equal(context('gpt-6-luna').pcModel_(),'gpt-6-luna'));
test('search request keeps the existing web tool, output schema, and budget',()=>{
 const ctx=context('gpt-5-mini');let captured;
 const properties=new Map();ctx.pcProps_=()=>({getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v)});
 ctx.pcPaused_=()=>false;ctx.pcSchedule_=()=>({count:1});ctx.pcRows_=()=>({values:[[]]});
 ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
 ctx.Utilities={formatDate:()=> '2026-11-25'};
 ctx.ScriptApp={getProjectTriggers:()=>[{getHandlerFunction:()=> 'pcTick'}]};ctx.pcStatus_=()=>{};ctx.pcLog_=()=>{};
 ctx.pcApi_=(method,path,body)=>{captured=body;return {id:'test-response',model:body.model};};
 ctx.pcStart();assert.equal(captured.model,'gpt-6.1-terra');assert.equal(captured.tools[0].type,'web_search');
 assert.equal(captured.text.format.type,'json_schema');assert.equal(captured.max_output_tokens,6000);assert.equal(captured.max_tool_calls,8);
});
