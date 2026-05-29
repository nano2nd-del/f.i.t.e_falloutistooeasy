{
  FITE_SetBNAM_Weapon.pas
  -----------------------------------------------------------------------------
  Sets BNAM to sc_kywd_CraftbenchWeapon on every selected COBJ record.

  HOW TO USE
  -----------
  1. Select the COBJ records you want in the left pane.
  2. Tools -> Apply Script -> this file.
  3. Make sure "Apply script to selected records" is CHECKED.
  4. Save when done.
  -----------------------------------------------------------------------------
}

unit FITE_SetBNAM_Weapon;

const
  TARGET_PLUGIN = 'WHATEVERYOURPATCHIS.esp';
  TARGET_EDID   = 'sc_kywd_CraftbenchWeapons';

var
  newKeyword: IInterface;

function Initialize: Integer;
begin
  Result := 0;

  newKeyword := RecordByEditorID(FileByName(TARGET_PLUGIN), TARGET_EDID);

  if not Assigned(newKeyword) then begin
    AddMessage('[SetBNAM_Weapon] ERROR: Could not find "' + TARGET_EDID +
               '" in ' + TARGET_PLUGIN + '. Make sure it is imported.');
    Result := 1;
    Exit;
  end;

  AddMessage('[SetBNAM_Weapon] Found: ' + Name(newKeyword));
  AddMessage('[SetBNAM_Weapon] Setting BNAM on selected records...');
end;

function Process(rec: IInterface): Integer;
var
  bnam: IInterface;
begin
  Result := 0;

  if Signature(rec) <> 'COBJ' then begin
    AddMessage('[SetBNAM_Weapon] Skipping non-COBJ: ' + Name(rec));
    Exit;
  end;

  bnam := ElementBySignature(rec, 'BNAM');
  if not Assigned(bnam) then
    bnam := Add(rec, 'BNAM', True);

  SetEditValue(bnam, Name(newKeyword));
  AddMessage('[SetBNAM_Weapon] Set [' + IntToHex(FormID(rec), 8) + '] ' + EditorID(rec));
end;

function Finalize: Integer;
begin
  AddMessage('[SetBNAM_Weapon] Done. Save your plugin.');
  Result := 0;
end;

end.
