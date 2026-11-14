export type Cell = number;
export type DroneId = number;
export interface Vec { x:number; y:number }
export interface ScanRecord { droneId:DroneId; seq:number; cell:Cell; tick:number; found:boolean; sig?:string }
export interface Intent { droneId:DroneId; target:Cell; tick:number }
export interface Knowledge { sourceRecords:ScanRecord[][]; records:Map<string,ScanRecord>; knownSeq:Map<DroneId,number>; misses:Int32Array; weights:Float64Array; peerIntents:Map<DroneId,Intent> }
export interface DroneState extends Knowledge { id:DroneId; pos:Vec; alive:boolean; target:Cell|null; battery:number; nextSeq:number; lastPick:number; trail:Vec[] }
export type Message = {kind:'hello';from:DroneId;pos:Vec;intent:Intent;knownSeq:[DroneId,number][]} | {kind:'records';from:DroneId;records:ScanRecord[]};
export interface Config { W:number; H:number; numDrones:number; pDetect:number; commRange:number; packetLoss:number; seed:string; strategy:'ours'|'centralized'|'nocomm'; maxTicks:number; signing?:boolean }
export interface Security { sign:(r:ScanRecord)=>string; verify:(r:ScanRecord)=>boolean }
export interface Envelope { to:number; at:number; message:Message | {kind:'target';from:number;target:Cell} }
export interface WorldState { cfg:Config; tick:number; prior:Float64Array; boxCell:Cell; drones:DroneState[]; mothership:Knowledge & {pos:Vec;alive:boolean}; stormUntil:number; found:{tick:number;by:DroneId}|null; events:string[]; random:()=>number; sensing:()=>number; queue:Envelope[]; security?:Security; scans:number; redundant:number; visited:Uint8Array; scannedBy:Uint8Array; firstScanner:Int16Array; coveredMass:number; links:[number,number][]; delivered:number; rejected:number; }
