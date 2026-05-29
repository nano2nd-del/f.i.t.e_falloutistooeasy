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
  AddMessage('[GMB] Exporting GasMaskBuff.ini...');
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

  // 1. STRICT STRUCTURAL FILTER
  // This validates the actual body slots of the armor.
  // 30(Head), 31(Hair), 32(Eyes), 35(Beard) are the only valid bits.
  bod2 := ElementByPath(e, 'BOD2\First Person Flags');
  if not Assigned(bod2) then bod2 := ElementByPath(e, 'BODT\First Person Flags');
  if not Assigned(bod2) then Exit;
  
  flags := GetNativeValue(bod2);
  if (flags and $27) = 0 then Exit; // Kill switch: If it doesn't use Head slots, drop it.

  // 2. Setup Naming
  edid := EditorID(e);
  elFull := ElementByPath(e, 'FULL');
  if Assigned(elFull) then entryName := GetEditValue(elFull) else entryName := edid;
  nameLower := LowerCase(entryName);

  // 3. Category Logic
  isMask := (Pos('mask', nameLower) > 0) or (Pos('respirator', nameLower) > 0) or (Pos('gas', nameLower) > 0);
  isHelmet := (Pos('helmet', nameLower) > 0) or (Pos('combat', nameLower) > 0);

  if not isMask and not isHelmet then Exit;

  // 4. Generate Output
  plugin := GetFileName(GetFile(e));
  shortFormID := IntToHex(FormID(e) and $00FFFFFF, 1);

  // Set Env Protection (Masks: 15/5, Helmets: 0)
  if isMask then begin
    if (Pos('assault', nameLower) > 0) or (Pos('military', nameLower) > 0) then envVal := '15' else envVal := '5';
  end else begin
    envVal := '0'; 
  end;

  line := 'filterByArmors=' + plugin + '|' + shortFormID + ':changeDamageTypes=Fallout4.esm|60A84=50,Fallout4.esm|60A85=50,Fallout4.esm|60A87=' + envVal;

  OutputList.Add('; ' + entryName);
  OutputList.Add(line);
  OutputList.Add('');

  RecordCount := RecordCount + 1;
end;

function Finalize: integer;
begin
  // Save as release-standard name
  OutputList.SaveToFile(ProgramPath + 'Edit Scripts\GasMaskBuff.ini');
  AddMessage('[GMB] Release Complete: ' + IntToStr(RecordCount) + ' items.');
  OutputList.Free;
  Result := 0;
end;

end.
