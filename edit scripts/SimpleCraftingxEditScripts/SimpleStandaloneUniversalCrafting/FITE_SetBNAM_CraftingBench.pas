{
  FITE_SetBNAM_CraftingBench.pas
  -----------------------------------------------------------------------------
  Sets BNAM to sk_CraftingBenchKeyword on every selected COBJ record.

  HOW TO USE
  -----------
  1. Select the COBJ records you want in the left pane.
  2. Tools -> Apply Script -> this file.
  3. Make sure "Apply script to selected records" is CHECKED.
  4. Save when done.
  -----------------------------------------------------------------------------
}

unit FITE_SetBNAM_CraftingBench;

const
  TARGET_PLUGIN = 'FITE_SimpleStandaloneCrafting.esp';
  TARGET_EDID   = 'sk_CraftingBenchKeyword';

var
  newKeyword: IInterface;

function Initialize: Integer;
begin
  Result := 0;

  newKeyword := RecordByEditorID(FileByName(TARGET_PLUGIN), TARGET_EDID);

  if not Assigned(newKeyword) then begin
    AddMessage('[SetBNAM_CraftingBench] ERROR: Could not find "' + TARGET_EDID +
               '" in ' + TARGET_PLUGIN + '. Make sure it is imported.');
    Result := 1;
    Exit;
  end;

  AddMessage('[SetBNAM_CraftingBench] Found: ' + Name(newKeyword));
  AddMessage('[SetBNAM_CraftingBench] Setting BNAM on selected records...');
end;

function Process(rec: IInterface): Integer;
var
  bnam: IInterface;
begin
  Result := 0;

  if Signature(rec) <> 'COBJ' then begin
    AddMessage('[SetBNAM_CraftingBench] Skipping non-COBJ: ' + Name(rec));
    Exit;
  end;

  bnam := ElementBySignature(rec, 'BNAM');
  if not Assigned(bnam) then
    bnam := Add(rec, 'BNAM', True);

  SetEditValue(bnam, Name(newKeyword));
  AddMessage('[SetBNAM_CraftingBench] Set [' + IntToHex(FormID(rec), 8) + '] ' + EditorID(rec));
end;

function Finalize: Integer;
begin
  AddMessage('[SetBNAM_CraftingBench] Done. Save your plugin.');
  Result := 0;
end;

end.
