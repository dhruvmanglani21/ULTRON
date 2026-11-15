$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
  $p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:ULTRON_INPUT)) | ConvertFrom-Json
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class UltronNative {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd,int nCmdShow);
 [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs,int size);
 [StructLayout(LayoutKind.Sequential)] struct INPUT {public uint type;public UNION u;}
 [StructLayout(LayoutKind.Explicit)] struct UNION {[FieldOffset(0)]public MOUSE mouse;[FieldOffset(0)]public KEY key;[FieldOffset(0)]public HARDWARE hardware;}
 [StructLayout(LayoutKind.Sequential)] struct MOUSE {public int dx,dy;public uint data,flags,time;public UIntPtr extra;}
 [StructLayout(LayoutKind.Sequential)] struct KEY {public ushort vk,scan;public uint flags,time;public UIntPtr extra;}
 [StructLayout(LayoutKind.Sequential)] struct HARDWARE {public uint message;public ushort low,high;}
 static INPUT Key(ushort vk,ushort scan,uint flags){return new INPUT{type=1,u=new UNION{key=new KEY{vk=vk,scan=scan,flags=flags}}};}
 static void Send(INPUT[] inputs){if(SendInput((uint)inputs.Length,inputs,Marshal.SizeOf(typeof(INPUT)))!=inputs.Length)throw new Exception("Windows blocked the keyboard action. Focus a normal, non-administrator app and try again.");}
 public static void TypeText(string text){var input=new INPUT[text.Length*2];for(int i=0;i<text.Length;i++){input[i*2]=Key(0,text[i],4);input[i*2+1]=Key(0,text[i],6);}Send(input);}
 public static void Shortcut(ushort[] keys){var input=new INPUT[keys.Length*2];for(int i=0;i<keys.Length;i++){input[i]=Key(keys[i],0,0);input[keys.Length+i]=Key(keys[keys.Length-i-1],0,2);}Send(input);}
}
'@
  function Window-Element([string]$id) {
    $handle = if ($id) { [IntPtr]([Int64]::Parse($id)) } else { [UltronNative]::GetForegroundWindow() }
    if ($handle -eq [IntPtr]::Zero) {throw 'No active window was found.'}
    $e = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
    if (!$e) {throw 'The selected window is unavailable.'}
    if (@($p.blocked_pids) -contains $e.Current.ProcessId) {throw 'Focus the target app, rather than an ULTRON window, and try again.'}
    if ($p.expected_pid -and $e.Current.ProcessId -ne [int]$p.expected_pid) {throw 'The target app changed. Inspect it again before continuing.'}
    return $e
  }
  function Window-Info($e) {
    $process = [Diagnostics.Process]::GetProcessById($e.Current.ProcessId)
    return @{window_id=([Int64]$e.Current.NativeWindowHandle).ToString();title=$e.Current.Name;process=$process.ProcessName;pid=$e.Current.ProcessId}
  }
  function Focus-Window($e) {
    $handle=[IntPtr]([Int64]$e.Current.NativeWindowHandle)
    [void][UltronNative]::ShowWindow($handle,9)
    if (![UltronNative]::SetForegroundWindow($handle)) {throw 'Windows did not allow app focus. Click that app once, then repeat the command.'}
    Start-Sleep -Milliseconds 120
  }
  function Runtime-Id($e) {return 'r_'+($e.GetRuntimeId() -join '-')}
  function Control-List($window) {
    $items=New-Object System.Collections.Generic.List[object]
    $condition=[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::IsOffscreenProperty,$false)
    $all=$window.FindAll([System.Windows.Automation.TreeScope]::Descendants,$condition)
    $max=[Math]::Min($all.Count,350)
    for($i=0;$i -lt $max;$i++) {
      $e=$all[$i]
      try {
        if($e.Current.IsPassword){continue}
        $name=$e.Current.Name
        if($name.Length -gt 140){$name=$name.Substring(0,140)}
        $items.Add(@{id=(Runtime-Id $e);name=$name;type=$e.Current.ControlType.ProgrammaticName;enabled=$e.Current.IsEnabled;focusable=$e.Current.IsKeyboardFocusable})
      } catch {}
    }
    return @($items.ToArray())
  }
  $result=@{success=$true}
  switch ($p.action) {
    'list_apps' {
      $query=[string]$p.text
      $apps=@(Get-StartApps | Where-Object {!$query -or $_.Name.IndexOf($query,[StringComparison]::OrdinalIgnoreCase) -ge 0} | Select-Object -First 60 Name,AppID)
      $result.apps=$apps
    }
    'open_app' {
      $name=([string]$p.text).Trim()
      if(!$name){throw 'Supply an app name.'}
      $aliases=@{'notepad'='Notepad';'calculator'='Calculator';'file explorer'='File Explorer';'paint'='Paint';'settings'='Settings';'word'='Word';'excel'='Excel';'chrome'='Google Chrome';'edge'='Microsoft Edge'}
      if($aliases.ContainsKey($name.ToLowerInvariant())){$name=$aliases[$name.ToLowerInvariant()]}
      $all=@(Get-StartApps)
      $matches=@($all|Where-Object {$_.Name -eq $name})
      if($matches.Count -eq 0){$matches=@($all|Where-Object {$_.Name.IndexOf($name,[StringComparison]::OrdinalIgnoreCase) -ge 0})}
      if($matches.Count -ne 1){$choices=($matches|Select-Object -First 12 -ExpandProperty Name)-join ', ';throw "Choose one exact installed app. Matches: $choices"}
      Start-Process -FilePath 'explorer.exe' -ArgumentList @('shell:AppsFolder\'+$matches[0].AppID)
      $result.message='Launch requested for '+$matches[0].Name+'. Inspect the window to verify it opened.'
    }
    'list_windows' {
      $all=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
      $windows=New-Object System.Collections.Generic.List[object]
      foreach($e in $all){try{if($e.Current.Name -and !(@($p.blocked_pids)-contains $e.Current.ProcessId)){$windows.Add((Window-Info $e))}}catch{}}
      $result.windows=@($windows.ToArray())
    }
    'foreground' {$result=Window-Info (Window-Element '');$result.success=$true}
    'focus_window' {$e=Window-Element $p.window_id;Focus-Window $e;$result=Window-Info $e;$result.success=$true}
    'inspect_window' {$e=Window-Element $p.window_id;$result=Window-Info $e;$result.success=$true;$result.controls=@(Control-List $e)}
    'click_control' {
      $window=Window-Element $p.window_id
      $all=$window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
      $target=$null
      foreach($candidate in $all){try{if((Runtime-Id $candidate)-eq $p.control_id){$target=$candidate;break}}catch{}}
      if(!$target){throw 'The selected control changed. Inspect the app again.'}
      if($target.Current.IsPassword -or !$target.Current.IsEnabled){throw 'That control cannot be used.'}
      Focus-Window $window
      $pattern=$null
      if($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)){$pattern.Invoke()}
      elseif($target.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$pattern)){$pattern.Select()}
      elseif($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern,[ref]$pattern)){$pattern.Toggle()}
      elseif($target.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern,[ref]$pattern)){$pattern.Expand()}
      else {throw 'This app does not expose an invokable UI Automation control here.'}
      $result.message='The approved control action was invoked. Inspect the app to verify the result.'
    }
    'type_text' {
      $window=Window-Element $p.window_id;Focus-Window $window
      $info=Window-Info $window
      if($info.process -match '^(powershell|pwsh|cmd|WindowsTerminal|conhost|CredentialUIBroker)$'){throw 'Terminal and credential-entry automation is outside this desktop agent.'}
      $focused=[System.Windows.Automation.AutomationElement]::FocusedElement
      if(!$focused -or $focused.Current.IsPassword){throw 'Focus an ordinary editable field first. Password fields are blocked.'}
      $type=$focused.Current.ControlType.ProgrammaticName
      $vp=$null;$hasValue=$focused.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$vp)
      if($hasValue -and $vp.Current.IsReadOnly){throw 'The focused field is read-only.'}
      if(!$hasValue -and $type -notin @('ControlType.Edit','ControlType.Document','ControlType.ComboBox')){throw 'The focused control is not an editable text field.'}
      if($focused.Current.ProcessId -ne $window.Current.ProcessId){throw 'The focused field belongs to a different app. No text was entered.'}
      if([UltronNative]::GetForegroundWindow() -ne [IntPtr]([Int64]$window.Current.NativeWindowHandle)){throw 'The target window changed. No text was entered.'}
      [UltronNative]::TypeText([string]$p.text)
      $result.message='Text input sent to '+$info.title
    }
    'press_shortcut' {
      $window=Window-Element $p.window_id;Focus-Window $window
      $keys=@{copy=@(17,67);paste=@(17,86);cut=@(17,88);undo=@(17,90);redo=@(17,89);select_all=@(17,65);find=@(17,70);save=@(17,83);new_tab=@(17,84);close_tab=@(17,87);next_tab=@(17,9);previous_tab=@(17,16,9);escape=@(27);enter=@(13)}
      if(!$keys.ContainsKey([string]$p.shortcut)){throw 'Unsupported keyboard shortcut.'}
      [UltronNative]::Shortcut([ushort[]]$keys[[string]$p.shortcut])
      $result.message='Keyboard shortcut sent to the selected app.'
    }
    default {throw 'Unsupported Windows action.'}
  }
  $result|ConvertTo-Json -Depth 10 -Compress
} catch { @{success=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress }
