unit UserScript;

var
  csvList: TStringList;

function Initialize: integer;
begin
  if not FilterApplied then begin
    MessageDlg('You need to apply a Conflict Filter in xEdit first for this script to accurately isolate records.', mtInformation, [mbOk], 0);
    Result := 1;
    Exit;
  end;

  csvList := TStringList.Create;
  // Flat CSV Header
  csvList.Add('Type,Current Mod,Record Name,FormID,Conflicting Mod');
  AddMessage('Processing conflicts and flattening data into CSV...');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  i, lo1, lo2, ovc: integer;
  currentMod, conflictMod, recName, formIdStr: string;
  m, ovr: IInterface;
begin
  Result := 0;

  if ElementType(e) <> etMainRecord then Exit;

  lo1 := GetLoadOrder(GetFile(e));
  if lo1 = 0 then Exit; // Skip vanilla masters base records

  if ConflictAllForNode(e) < caOverride then Exit;
  
  m := MasterOrSelf(e);
  ovc := OverrideCount(m);
  currentMod := GetFileName(GetFile(e));
  recName := StringReplace(Name(e), '"', '""', [rfReplaceAll]);
  formIdStr := IntToHex(FormID(e), 8);

  for i := 0 to Pred(ovc) do begin
    ovr := OverrideByIndex(m, i);
    conflictMod := GetFileName(GetFile(ovr));
    lo2 := GetLoadOrder(GetFile(ovr));
    
    if lo2 <> 0 then begin
      if lo2 > lo1 then begin
        // Current mod loses to a downstream plugin
        csvList.Add('"Loss","' + currentMod + '","' + recName + '","' + formIdStr + '","' + conflictMod + '"');
      end else if lo2 < lo1 then begin
        // Current mod wins against an upstream plugin
        csvList.Add('"Win","' + currentMod + '","' + recName + '","' + formIdStr + '","' + conflictMod + '"');
      end else if (lo2 = lo1) and (i < Pred(ovc)) and GetIsDeleted(ovr) then begin
        // CRITICAL: This file deletes the record, but a later mod overrides it anyway (CTD Risk)
        csvList.Add('"CRITICAL WARNING: Overridden Deleted Record","' + currentMod + '","' + recName + '","' + formIdStr + '","' + GetFileName(GetFile(OverrideByIndex(m, ovc - 1))) + '"');
      end;
    end;
  end;
end;

function Finalize: integer;
var
  exportPath: string;
begin
  exportPath := ProgramPath + 'PluginConflictReport.csv';
  
  AddMessage('Total conflict rows tracked: ' + IntToStr(csvList.Count - 1));
  
  try
    csvList.SaveToFile(exportPath);
    AddMessage('Export complete. File saved directly to: ' + exportPath);
  except
    AddMessage('Error: Execution completed but could not write file. Check directory permissions.');
  end;

  csvList.Free;
  Result := 0;
end;

end.
