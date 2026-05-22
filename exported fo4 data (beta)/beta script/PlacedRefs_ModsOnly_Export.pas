unit userscript;

var
  outFile:     TStringList;
  outPath:     string;
  totalRecs:   integer;
  skipNoCoords: integer;
  processedFiles: TStringList;
  currentFile: string;
  fileSkipped: boolean;

function IsBaseOrDLC(filename: string): boolean;
var
  lower: string;
begin
  lower := LowerCase(filename);
  Result := 
    (lower = 'fallout4.esm') or
    (Pos('dlcrobot', lower) > 0) or
    (Pos('dlcworkshop', lower) > 0) or
    (Pos('dlccoast', lower) > 0) or
    (Pos('dlcnuka', lower) > 0);
end;

function GetParentCell(e: IInterface): IInterface;
begin
  Result := GetContainer(e);
  while Assigned(Result) and (Signature(Result) <> 'CELL') do
    Result := GetContainer(Result);
end;

function SafeCSV(s: string): string;
begin
  if (Pos(',', s) > 0) or (Pos('"', s) > 0) then
    Result := '"' + StringReplace(s, '"', '""', [rfReplaceAll]) + '"'
  else
    Result := s;
end;

function Initialize: integer;
begin
  outFile        := TStringList.Create;
  processedFiles := TStringList.Create;
  totalRecs      := 0;
  skipNoCoords   := 0;
  currentFile    := '';
  fileSkipped    := False;
  outPath        := ProgramPath + 'Edit Scripts\placed_refs_mods_only.csv';

  outFile.Add(
    'source_file,' +
    'ref_formid,' +
    'base_formid,' +
    'base_editorid,' +
    'base_signature,' +
    'pos_x,' +
    'pos_y,' +
    'pos_z,' +
    'rot_z'
  );

  AddMessage('[PlacedRefs] Mods-Only Export started (file-level filtering)');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  src: IInterface;
  sig, line: string;
  srcFile: string;
  refFormID, baseFormID, baseSig, baseEdID: string;
  posX, posY, posZ, rotZ: string;
  base: IInterface;
begin
  Result := 0;
  sig := Signature(e);
  if (sig <> 'REFR') and (sig <> 'ACHR') then exit;

  src := GetFile(e);
  if not Assigned(src) then exit;
  srcFile := GetFileName(src);

  // File-level filtering: check if this file is base/DLC
  if currentFile <> srcFile then begin
    currentFile := srcFile;
    if IsBaseOrDLC(srcFile) then begin
      fileSkipped := True;
      if processedFiles.IndexOf(srcFile) < 0 then begin
        AddMessage('[PlacedRefs] SKIP FILE: ' + srcFile + ' (base/DLC)');
        processedFiles.Add(srcFile);
      end;
    end else begin
      fileSkipped := False;
      if processedFiles.IndexOf(srcFile) < 0 then begin
        AddMessage('[PlacedRefs] PROCESS FILE: ' + srcFile);
        processedFiles.Add(srcFile);
      end;
    end;
  end;

  // Skip entire file if marked
  if fileSkipped then exit;

  // Get coordinates first (fastest rejection)
  posX := GetElementEditValues(e, 'DATA\Position\X');
  posY := GetElementEditValues(e, 'DATA\Position\Y');
  posZ := GetElementEditValues(e, 'DATA\Position\Z');

  if (posX = '') or (posY = '') or (posZ = '') then begin
    Inc(skipNoCoords);
    exit;
  end;

  // Base record
  base := LinksTo(ElementByName(e, 'NAME - Base'));
  if Assigned(base) then begin
    baseSig    := Signature(base);
    baseFormID := IntToHex(GetLoadOrderFormID(base), 8);
    baseEdID   := EditorID(base);
  end else begin
    baseSig    := 'UNKNOWN';
    baseFormID := '00000000';
    baseEdID   := '';
  end;

  refFormID := IntToHex(GetLoadOrderFormID(e), 8);
  rotZ := GetElementEditValues(e, 'DATA\Rotation\Z');

  line :=
    SafeCSV(srcFile)  + ',' +
    refFormID         + ',' +
    baseFormID        + ',' +
    SafeCSV(baseEdID) + ',' +
    baseSig           + ',' +
    posX + ',' + posY + ',' + posZ + ',' +
    rotZ;

  outFile.Add(line);
  Inc(totalRecs);

  if (totalRecs mod 25000) = 0 then begin
    outFile.SaveToFile(outPath);
    AddMessage('[PlacedRefs] Checkpoint: ' + IntToStr(totalRecs) + ' refs from mods');
  end;
end;

function Finalize: integer;
begin
  outFile.SaveToFile(outPath);
  outFile.Free;
  processedFiles.Free;
  
  AddMessage('[PlacedRefs] ===== SUMMARY =====');
  AddMessage('[PlacedRefs] Valid mods refs: ' + IntToStr(totalRecs));
  AddMessage('[PlacedRefs] Skipped (no coords): ' + IntToStr(skipNoCoords));
  AddMessage('[PlacedRefs] Files processed: ' + IntToStr(processedFiles.Count));
  AddMessage('[PlacedRefs] Complete - ' + outPath);
  
  Result := 0;
end;

end.
