{
  FITE_SetBNAM_ChemBench.pas
  -----------------------------------------------------------------------------
  Sets BNAM to WorkbenchChemlab on every selected COBJ record.

  HOW TO USE
  -----------
  1. Select the COBJ records you want in the left pane.
  2. Tools -> Apply Script -> this file.
  3. Make sure "Apply script to selected records" is CHECKED.
  4. Save when done.
  -----------------------------------------------------------------------------
}

unit FITE_SetBNAM_ChemBench;

const
  TARGET_EDID = 'WorkbenchChemlab';

var
  newKeyword: IInterface;

function Initialize: Integer;
var
  i: Integer;
begin
  Result := 0;

  // Vanilla keyword — search all loaded files
  newKeyword := nil;
  for i := 0 to Pred(FileCount) do begin
    newKeyword := RecordByEditorID(FileByIndex(i), TARGET_EDID);
    if Assigned(newKeyword) then Break;
  end;

  if not Assigned(newKeyword) then begin
    AddMessage('[SetBNAM_ChemBench] ERROR: Could not find "' + TARGET_EDID + '".');
    Result := 1;
    Exit;
  end;

  AddMessage('[SetBNAM_ChemBench] Found: ' + Name(newKeyword) +
             ' in ' + GetFileName(GetFile(newKeyword)));
  AddMessage('[SetBNAM_ChemBench] Setting BNAM on selected records...');
end;

function Process(rec: IInterface): Integer;
var
  bnam: IInterface;
begin
  Result := 0;

  if Signature(rec) <> 'COBJ' then begin
    AddMessage('[SetBNAM_ChemBench] Skipping non-COBJ: ' + Name(rec));
    Exit;
  end;

  bnam := ElementBySignature(rec, 'BNAM');
  if not Assigned(bnam) then
    bnam := Add(rec, 'BNAM', True);

  SetEditValue(bnam, Name(newKeyword));
  AddMessage('[SetBNAM_ChemBench] Set [' + IntToHex(FormID(rec), 8) + '] ' + EditorID(rec));
end;

function Finalize: Integer;
begin
  AddMessage('[SetBNAM_ChemBench] Done. Save your plugin.');
  Result := 0;
end;

end.
