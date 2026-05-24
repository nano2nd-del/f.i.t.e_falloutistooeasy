unit userscript;

{ Phantom Pain - Fallout 4 Record Extractor v2
  Extracts weapon, armor, NPC, outfit, ammo, keyword, faction data
  Organized: output/[RECORD_TYPE]/[SourceFile].csv
}

var
  outPath:        string;
  snapshotDate:   string;
  totalRecs:      integer;
  manifestLines:  TStringList;

function SafeCSV(s: string): string;
begin
  if (Pos(',', s) > 0) or (Pos('"', s) > 0) then
    Result := '"' + StringReplace(s, '"', '""', [rfReplaceAll]) + '"'
  else
    Result := s;
end;

function GetSrcFile(e: IInterface): string;
var
  src: IInterface;
begin
  src := GetFile(e);
  if Assigned(src) then
    Result := GetFileName(src)
  else
    Result := 'UNKNOWN';
end;

function GetFID(e: IInterface): string;
begin
  Result := IntToHex(GetLoadOrderFormID(e), 8);
end;

function GetHeader(recType: string): string;
begin
  if recType = 'WEAP' then
    Result := 'editorid,name,formid,damage,keywords'
  else if recType = 'ARMO' then
    Result := 'editorid,name,formid,armortype,slot,armor,keywords'
  else if recType = 'NPC_' then
    Result := 'editorid,name,formid,race,level,outfit'
  else if recType = 'OTFT' then
    Result := 'editorid,formid,items'
  else if recType = 'AMMO' then
    Result := 'editorid,name,formid,damage'
  else if recType = 'KYWD' then
    Result := 'editorid,keyword'
  else if recType = 'FACT' then
    Result := 'editorid,name'
  else
    Result := 'editorid,formid';
end;

procedure EnsureDir(path: string);
begin
  if not DirectoryExists(path) then
    ForceDirectories(path);
end;

procedure AppendToCSV(filePath: string; line: string);
var
  f: TStringList;
  recType: string;
  filename: string;
begin
  f := TStringList.Create;
  try
    // Extract record type from path (output/WEAP/file.csv -> WEAP)
    if Pos('/WEAP/', filePath) > 0 then recType := 'WEAP'
    else if Pos('/ARMO/', filePath) > 0 then recType := 'ARMO'
    else if Pos('/NPC_/', filePath) > 0 then recType := 'NPC_'
    else if Pos('/OTFT/', filePath) > 0 then recType := 'OTFT'
    else if Pos('/AMMO/', filePath) > 0 then recType := 'AMMO'
    else if Pos('/KYWD/', filePath) > 0 then recType := 'KYWD'
    else if Pos('/FACT/', filePath) > 0 then recType := 'FACT'
    else recType := 'UNKNOWN';
    
    if FileExists(filePath) then
      f.LoadFromFile(filePath)
    else
      f.Add(GetHeader(recType) + ',source_file,snapshot_date');
    
    f.Add(line);
    f.SaveToFile(filePath);
  finally
    f.Free;
  end;
end;

function ExtractLine(e: IInterface): string;
var
  sig, eid, name, fid, src: string;
  line: string;
begin
  sig := Signature(e);
  eid := EditorID(e);
  name := GetElementEditValues(e, 'FULL');
  fid := GetFID(e);
  src := GetSrcFile(e);
  
  line := '';
  
  if sig = 'WEAP' then
    line := SafeCSV(eid) + ',' + SafeCSV(name) + ',' + fid + ',' +
            SafeCSV(GetElementEditValues(e, 'DATA\Damage')) + ','
  else if sig = 'ARMO' then
    line := SafeCSV(eid) + ',' + SafeCSV(name) + ',' + fid + ',' +
            SafeCSV(GetElementEditValues(e, 'DATA\Armor Type')) + ',' +
            SafeCSV(GetElementEditValues(e, 'BOD2\Part')) + ',' +
            SafeCSV(GetElementEditValues(e, 'DATA\Armor')) + ','
  else if sig = 'NPC_' then
    line := SafeCSV(eid) + ',' + SafeCSV(name) + ',' + fid + ',' +
            SafeCSV(GetElementEditValues(e, 'RNAM')) + ',' +
            SafeCSV(GetElementEditValues(e, 'DATA\Level')) + ',' +
            SafeCSV(GetElementEditValues(e, 'DNAM'))
  else if sig = 'OTFT' then
    line := SafeCSV(eid) + ',' + fid + ','
  else if sig = 'AMMO' then
    line := SafeCSV(eid) + ',' + SafeCSV(name) + ',' + fid + ',' +
            SafeCSV(GetElementEditValues(e, 'DATA\Damage'))
  else if sig = 'KYWD' then
    line := SafeCSV(eid) + ',' + SafeCSV(GetElementEditValues(e, 'CNAM'))
  else if sig = 'FACT' then
    line := SafeCSV(eid) + ',' + SafeCSV(name);
  
  Result := line;
end;

function Initialize: integer;
begin
  outPath := ProgramPath + 'output\';
  snapshotDate := FormatDateTime('yyyy-mm-dd hh:mm:ss', Now());
  totalRecs := 0;
  manifestLines := TStringList.Create;
  
  EnsureDir(outPath);
  
  manifestLines.Add('[Phantom Pain] Record Extraction Manifest');
  manifestLines.Add('Snapshot Date: ' + snapshotDate);
  manifestLines.Add('');
  manifestLines.Add('Output Structure: output/[RECORD_TYPE]/[SourceFile].csv');
  manifestLines.Add('');
  manifestLines.Add('Record Types:');
  manifestLines.Add('  WEAP - Weapons');
  manifestLines.Add('  ARMO - Armor');
  manifestLines.Add('  NPC_ - NPCs');
  manifestLines.Add('  OTFT - Outfits');
  manifestLines.Add('  AMMO - Ammunition');
  manifestLines.Add('  KYWD - Keywords');
  manifestLines.Add('  FACT - Factions');
  manifestLines.Add('');
  
  AddMessage('[Phantom Pain] Initialize at ' + snapshotDate);
  AddMessage('[Phantom Pain] Output: ' + outPath);
  
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  sig, recType, eid, line, srcFile, folderPath, filePath: string;
begin
  Result := 0;
  sig := Signature(e);
  eid := EditorID(e);
  
  // Only process target record types
  if (sig <> 'WEAP') and (sig <> 'ARMO') and (sig <> 'NPC_') and 
     (sig <> 'OTFT') and (sig <> 'AMMO') and (sig <> 'KYWD') and 
     (sig <> 'FACT') then
    Exit;
  
  // Skip if no editor ID
  if eid = '' then
    Exit;
  
  srcFile := GetSrcFile(e);
  line := ExtractLine(e);
  
  if line <> '' then begin
    recType := sig;
    folderPath := outPath + recType + '\';
    EnsureDir(folderPath);
    
    filePath := folderPath + srcFile + '.csv';
    line := line + ',' + SafeCSV(srcFile) + ',' + snapshotDate;
    
    AppendToCSV(filePath, line);
    Inc(totalRecs);
    
    if (totalRecs mod 5000) = 0 then
      AddMessage('[Phantom Pain] ' + IntToStr(totalRecs) + ' records extracted...');
  end;
end;

function Finalize: integer;
begin
  manifestLines.Add('Total Records Extracted: ' + IntToStr(totalRecs));
  manifestLines.Add('');
  manifestLines.Add('NOTE: FormIDs are valid only with current load order.');
  manifestLines.Add('Use EditorID as primary key for database queries.');
  manifestLines.SaveToFile(outPath + 'MANIFEST.txt');
  
  AddMessage('[Phantom Pain] ===== COMPLETE =====');
  AddMessage('[Phantom Pain] Records extracted: ' + IntToStr(totalRecs));
  AddMessage('[Phantom Pain] Output path: ' + outPath);
  AddMessage('[Phantom Pain] Manifest: ' + outPath + 'MANIFEST.txt');
  
  manifestLines.Free;
  Result := 0;
end;

end.
