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
  AddMessage('[GMB] Script started.');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  bod2, elFull: IInterface;
  flags: Integer;
  plugin, fullFormID, shortFormID, entryName, envVal, edid: string;
begin
  Result := 0;

  if Signature(e) <> 'ARMO' then Exit;

  // 1. Locate Biped Flags
  bod2 := ElementByPath(e, 'BOD2\First Person Flags');
  if not Assigned(bod2) then
    bod2 := ElementByPath(e, 'BODT\First Person Flags');
  
  if not Assigned(bod2) then Exit;
  
  // 2. Safe Integer conversion for bitmasking
  flags := Integer(GetNativeValue(bod2));
  
  // 3. Filter for Head (30), Hair (31), or Eyes (32) slots via mod
  if (flags mod 8) = 0 then Exit;

  // 4. Gather Identifiers
  plugin := GetFileName(GetFile(e));
  edid   := EditorID(e);
  
  // 5. SAFE FORMID HANDLING: Get the Hex string directly to avoid math errors
  fullFormID := IntToHex(FormID(e), 8);
  // Take only the last 6 characters (strips the load order prefix)
  shortFormID := Copy(fullFormID, 3, 6); 
  
  // Strip leading zeros to match your required pattern (e.g., 00000F9A -> F9A)
  while (Length(shortFormID) > 1) and (shortFormID[1] = '0') do
    shortFormID := Copy(shortFormID, 2, Length(shortFormID) - 1);

  elFull := ElementByPath(e, 'FULL');
  if Assigned(elFull) then 
    entryName := GetEditValue(elFull) 
  else 
    entryName := edid;

  // 6. Tiering Logic (Assault/Military get 15, others get 5)
  if (Pos('Assault', entryName) > 0) or (Pos('Assault', edid) > 0) or (Pos('Military', entryName) > 0) then
    envVal := '15'
  else
    envVal := '5';

  // 7. Format exactly like GasMaskBuff.ini
  OutputList.Add('; ' + entryName);
  OutputList.Add('filterByArmors=' + plugin + '|' + shortFormID + ':changeDamageTypes=Fallout4.esm|60A84=50,Fallout4.esm|60A85=50,Fallout4.esm|60A87=' + envVal);
  OutputList.Add('');

  RecordCount := RecordCount + 1;
end;

function Finalize: integer;
var
  SavePath: string;
begin
  SavePath := ProgramPath + 'Edit Scripts\GasMaskBuff.ini';
  
  if RecordCount > 0 then begin
    try
      OutputList.SaveToFile(SavePath);
      AddMessage('[GMB] Success! Exported ' + IntToStr(RecordCount) + ' items.');
      AddMessage('[GMB] File saved to: ' + SavePath);
    except
      on Ex: Exception do
        AddMessage('[GMB] Error saving file: ' + Ex.Message);
    end;
  end else begin
    AddMessage('[GMB] No matching headgear records found.');
  end;

  OutputList.Free;
  Result := 0;
end;

end.
