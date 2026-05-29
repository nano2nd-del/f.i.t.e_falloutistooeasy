{
  FITE_SetBNAM_Armor.pas
  -----------------------------------------------------------------------------
  Sets BNAM to sc_kywd_CraftbenchArmor on every selected COBJ record.

  HOW TO USE
  -----------
  1. Select the COBJ records you want in the left pane.
  2. Tools -> Apply Script -> this file.
  3. Make sure "Apply script to selected records" is CHECKED.
  4. Save when done.
  -----------------------------------------------------------------------------
}

unit FITE_SetBNAM_Armor;

const
  TARGET_PLUGIN = 'WRITEYOURESP.esp';
  TARGET_EDID   = 'sc_kywd_CraftbenchArmor';

var
  newKeyword: IInterface;

function Initialize: Integer;
begin
  Result := 0;

  // Keyword is already imported into our ESP — search there first
  newKeyword := RecordByEditorID(FileByName(TARGET_PLUGIN), TARGET_EDID);

  if not Assigned(newKeyword) then begin
    AddMessage('[SetBNAM_Armor] ERROR: Could not find "' + TARGET_EDID +
               '" in ' + TARGET_PLUGIN + '. Make sure it is imported.');
    Result := 1;
    Exit;
  end;

  AddMessage('[SetBNAM_Armor] Found: ' + Name(newKeyword));
  AddMessage('[SetBNAM_Armor] Setting BNAM on selected records...');
end;

function Process(rec: IInterface): Integer;
var
  bnam: IInterface;
begin
  Result := 0;

  if Signature(rec) <> 'COBJ' then begin
    AddMessage('[SetBNAM_Armor] Skipping non-COBJ: ' + Name(rec));
    Exit;
  end;

  bnam := ElementBySignature(rec, 'BNAM');
  if not Assigned(bnam) then
    bnam := Add(rec, 'BNAM', True);

  SetEditValue(bnam, Name(newKeyword));
  AddMessage('[SetBNAM_Armor] Set [' + IntToHex(FormID(rec), 8) + '] ' + EditorID(rec));
end;

function Finalize: Integer;
begin
  AddMessage('[SetBNAM_Armor] Done. Save your plugin.');
  Result := 0;
end;

end.
