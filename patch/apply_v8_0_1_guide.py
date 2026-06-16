#!/usr/bin/env python3
# OVERHEAD v8.0.1 — guide shows on every visit; ZENYTH denial prompt waits for guide close.
import io
P="index.html"
s=io.open(P,encoding="utf-8").read()
def sub(old,new,label):
    assert s.count(old)==1, f"[{label}] matches={s.count(old)}"
    return s.replace(old,new,1)

# 1) ohBoot — always start the guide (drop the localStorage "seen" gate)
s=sub(
"  let seen=false; try{ seen = localStorage.getItem('overhead-tour-done')==='1'; }catch(e){}\n  if(!seen) setTimeout(ohStartTour, 400);",
"  // v8: the guide shows on EVERY visit (no \"seen\" flag stored).\n"
"  setTimeout(ohStartTour, 400);",
"ohBoot-gate")

# 2) ohEndTour — stop storing the flag; fire any deferred ZENYTH denial prompt
s=sub(
"  try{ localStorage.setItem('overhead-tour-done','1'); }catch(e){}\n  // one-time, post-interaction: enable ISS alerts if location was granted\n  ohRequestNotify();",
"  // v8: no \"seen\" flag stored — the guide is meant to show every visit.\n"
"  // one-time, post-interaction: enable ISS alerts if location was granted\n"
"  ohRequestNotify();\n"
"  // If GPS was denied, surface the ZENYTH prompt now the guide is closed (no overlap).\n"
"  if(OH.zenPromptPending){ OH.zenPromptPending=false; setTimeout(function(){ zenOpen(); ohToast('LOCATION NOT SHARED','No problem \u2014 pick a city or type your coordinates so ZENYTH can show the sky above you.','#7fd4ff'); }, 300); }",
"ohEndTour-store")

# 3) init denial branch — defer instead of opening immediately
s=sub(
"  if(OH.locDenied){ setTimeout(function(){ zenOpen(); ohToast('LOCATION NOT SHARED','No problem \u2014 pick a city or type your coordinates so ZENYTH can show the sky above you.','#7fd4ff'); }, 1400); }",
"  if(OH.locDenied){ OH.zenPromptPending=true; } // shown after the guide is closed",
"init-denial-defer")

io.open(P,"w",encoding="utf-8").write(s)
print("PATCH OK")
