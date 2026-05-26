unit GasMaskBuffExport;

interface
implementation

uses xEditAPI, Classes, SysUtils;

var
  OutputList: TStringList;
  RecordCount: Integer;

function Initialize: integer;
begin
  OutputList := TStringList.Create;
  RecordCount := 0;
  AddMessage('[GMB] Exporting Double-Buff Version...');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  bod2, elFull: IInterface;
  plugin, shortFormID, entryName, edid, envVal, line: string;
  flags: Cardinal;
  isMask, isHelmet: Boolean;
  nameLower: string;
begin
  Result := 0;
  if Signature(e) <> 'ARMO' then Exit;

  // Structural Validation (Head slots only)
  bod2 := ElementByPath(e, 'BOD2\First Person Flags');
  if not Assigned(bod2) then bod2 := ElementByPath(e, 'BODT\First Person Flags');
  if not Assigned(bod2) then Exit;
  
  flags := GetNativeValue(bod2);
  if (flags and $27) = 0 then Exit; 

  edid := EditorID(e);
  elFull := ElementByPath(e, 'FULL');
  if Assigned(elFull) then entryName := GetEditValue(elFull) else entryName := edid;
  nameLower := LowerCase(entryName);

  isMask := (Pos('mask', nameLower) > 0) or (Pos('respirator', nameLower) > 0) or (Pos('gas', nameLower) > 0);
  isHelmet := (Pos('helmet', nameLower) > 0) or (Pos('combat', nameLower) > 0);

  if not isMask and not isHelmet then Exit;

  plugin := GetFileName(GetFile(e));
  shortFormID := IntToHex(FormID(e) and $00FFFFFF, 1);

  // DOUBLE BUFF LOGIC
  // Masks: 10 or 30 Env. Helmets: 0 Env.
  if isMask then begin
    if (Pos('assault', nameLower) > 0) or (Pos('military', nameLower) > 0) then envVal := '30' else envVal := '10';
  end else begin
    envVal := '0'; 
  end;

  // Applying 100 (Double the previous 50)
  line := 'filterByArmors=' + plugin + '|' + shortFormID + ':changeDamageTypes=Fallout4.esm|60A84=100,Fallout4.esm|60A85=100,Fallout4.esm|60A87=' + envVal;

  OutputList.Add('; ' + entryName);
  OutputList.Add(line);
  OutputList.Add('');

  RecordCount := RecordCount + 1;
end;

function Finalize: integer;
begin
  OutputList.SaveToFile(ProgramPath + 'Edit Scripts\GasMaskBuff.ini');
  AddMessage('[GMB] Double-Buff Export Complete: ' + IntToStr(RecordCount) + ' items.');
  OutputList.Free;
  Result := 0;
end;

end.