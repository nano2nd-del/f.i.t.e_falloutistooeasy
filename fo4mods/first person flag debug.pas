unit userscript;

interface
implementation

uses xEditAPI, Classes, SysUtils;

var
  iDebug: Integer;

function Initialize: integer;
begin
  iDebug := 0;
  AddMessage('[DBG] Started');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  bod2: IInterface;
  i: Integer;
  child: IInterface;
begin
  Result := 0;
  if not Assigned(e) then Exit;
  if Signature(e) <> 'ARMO' then Exit;
  if iDebug > 3 then Exit;   // only inspect first 4 ARMO records

  AddMessage('[DBG] --- ' + Name(e) + ' ---');

  bod2 := ElementBySignature(e, 'BOD2');
  if not Assigned(bod2) then begin
    bod2 := ElementBySignature(e, 'BODT');
    if Assigned(bod2) then AddMessage('[DBG]   Found BODT')
    else AddMessage('[DBG]   No BOD2 or BODT');
    Inc(iDebug);
    Exit;
  end;

  AddMessage('[DBG]   Found BOD2, child count: ' + IntToStr(ElementCount(bod2)));
  for i := 0 to ElementCount(bod2) - 1 do begin
    child := ElementByIndex(bod2, i);
    if Assigned(child) then
      AddMessage('[DBG]     [' + IntToStr(i) + '] Name="' + Name(child)
        + '"  Value="' + GetEditValue(child) + '"');
  end;

  Inc(iDebug);
end;

function Finalize: integer;
begin
  AddMessage('[DBG] Done');
  Result := 0;
end;

end.
