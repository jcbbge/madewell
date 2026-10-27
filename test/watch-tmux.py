#!/usr/bin/env python3
"""Bounded, event-driven tmux acceptance against real CLI/SQLite/git/check execution.
Uses the repo's scripted worker, not paid agents or the operator's delivery store.
Run on the VPS from the candidate checkout. Always tears down its session/processes.
"""
import json, os, pathlib, select, shutil, subprocess, tempfile, time

checkout = pathlib.Path.cwd()
cli = str(checkout / 'dist/mw.mjs')
root = pathlib.Path(tempfile.mkdtemp(prefix='mw-watch-live-'))
name = 'mw-watch-acceptance-' + str(os.getpid())
env = dict(os.environ, MW_HOME=str(root/'home'), MW_AUTORUN='0', MW_DEBUG='0',
           MW_WORKER_COMMAND='node ' + str(checkout/'test/fixtures/scripted-worker.ts'),
           FAKE_LOG=str(root/'calls.log'), FAKE_PAUSE='plan:' + str(root/'pause'))
env.pop('MW_STORE', None)
runner = control = None
receipts = []

def mw(repo, *args):
    r = subprocess.run(['node', cli, *args], cwd=repo, env=env, capture_output=True, text=True, timeout=20)
    assert r.returncode == 0, (args, r.stderr)
    return json.loads(r.stdout)

def command(*args):
    return subprocess.check_output(['tmux', *args], text=True)

def capture():
    return command('capture-pane', '-p', '-t', name + ':0.0')

def wait_screen(check, label, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        ready, _, _ = select.select([control.stdout], [], [], max(0, deadline-time.monotonic()))
        assert ready, 'timeout: ' + label
        chunk = os.read(control.stdout.fileno(), 1 << 16)
        assert chunk, 'control client exited: ' + label
        if b'%output' not in chunk: continue
        screen = capture()
        if check(screen):
            receipts.append({'check': label, 'screen': screen})
            return screen
    raise AssertionError('timeout: ' + label)

def keys(*args):
    command('send-keys', '-t', name + ':0.0', *args)

try:
    repos = [root/'project-a', root/'project-b']
    for repo in repos:
        repo.mkdir()
        subprocess.run(['git', 'init', '-q', '-b', 'main', str(repo)], check=True)
        for k,v in [('user.name','Watch acceptance'),('user.email','acceptance@localhost')]:
            subprocess.run(['git','-C',str(repo),'config',k,v],check=True)
        subprocess.run(['git','-C',str(repo),'commit','-q','--allow-empty','-m','Acceptance baseline'],check=True)
        mw(repo, 'init', '--autonomy','full','--ship','true','--alert','true')
        mw(repo, 'start', '--objective','Export CSV in ' + repo.name, '--source','Create a script printing a,b.')
    mw(repos[0], 'discover', '--source','Find two pieces of work.', '--autonomy','checkpoints')
    # Reproduce an older item's missing default pack, only in this isolated acceptance database.
    legacy = "import {DatabaseSync} from 'node:sqlite'; const d=new DatabaseSync(process.env.MW_HOME+'/madewell.db');d.exec(\"UPDATE items SET doc=json_remove(doc,'$.pack') WHERE id=1\");d.close();"
    subprocess.run(['node','--input-type=module','-e',legacy],cwd=checkout,env=env,check=True)
    (root/'pause').touch()
    out = open(root/'runner.log','wb')
    runner = subprocess.Popen(['node',cli,'run'], cwd=repos[0], env=env, stdout=out, stderr=out)
    # Control mode transports actual tmux output events; no sleep/retry capture loop.
    shell = 'before=$(stty -g); node ' + cli + ' watch --all; after=$(stty -g); [ "$before" = "$after" ] && echo TERMINAL_RESTORED; exec sh'
    control = subprocess.Popen(['tmux','-C','new-session','-e','MW_HOME='+str(root/'home'),'-e','MW_STORE='+str(root/'home/madewell.db'),'-e','MW_DEBUG=0','-s',name,'-x','130','-y','65','-c',str(repos[0]),shell], env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    control.stdin.write(b'refresh-client -C 130,65\n'); control.stdin.flush()
    wait_screen(lambda s: 'MADE WELL' in s, 'terminal launches', 15)
    command('resize-window','-t',name+':0','-x','130','-y','65')
    wait_screen(lambda s: s.count('writing the plan') >= 2 and 'NO RUNNER' not in s, 'two concurrent delivery pipelines visible', 60)
    state = mw(repos[0], 'status')
    assert len([i for i in state['items'] if i['status']=='running' and i['job']=='plan']) == 2, state
    runner.kill(); runner.wait(timeout=10)
    wait_screen(lambda s: 'NO RUNNER' in s, 'runner death visible without erasing saved work', 10)
    trace = mw(repos[0], 'trace', '1', '--lens','ax')
    assert any(e['kind']=='pack-pinned' and e['data']['historicalDefinition']=='unknown' for e in trace['events'])
    assert trace['itemRecord']['pack']['discovery'][0]['steps'][0]['duty']
    receipts.append({'check':'legacy resumption pins the effective pack without inventing its history'})
    assert any(i['status']=='lost' for i in trace['invocations'])
    assert any(e['kind']=='trace-output' and 'planner is still working' in str(e['data']) for e in trace['events'])
    receipts.append({'check':'killed runner retains lost invocation and output', 'item':1})
    keys('a')
    wait_screen(lambda s: str(repos[0]) in s and 'project-b' not in s, 'project-local scope', 10)
    keys('m')
    wait_screen(lambda s: 'HOST ' in s and 'CPU' in s and 'Memory ' in s, 'host measurements', 10)
    keys('m','j')
    wait_screen(lambda s: 'Round ' in s and 'Next move owed by:' in s, 'pipeline detail', 10)
    keys('Enter','G')
    wait_screen(lambda s: '"events"' in s or '"trace-' in s or '"kind"' in s, 'full evidence scroll', 10)
    command('resize-window','-t',name+':0','-x','38','-y','16')
    keys('0','?')
    narrow=wait_screen(lambda s: 'KEYS' in s, 'narrow-pane help and resize',10)
    assert len(narrow.splitlines()) <= 16
    keys('?','q','Enter')
    wait_screen(lambda s: 'TERMINAL_RESTORED' in s, 'quit restores terminal despite coalesced keys',10)
    (root/'pause').unlink()
    runner = subprocess.Popen(['node',cli,'run'], cwd=repos[0], env=env, stdout=out, stderr=out)
    assert runner.wait(timeout=120)==0, (root/'runner.log').read_text()[-4000:]
    final = mw(repos[0], 'status')
    assert len([i for i in final['items'] if i['status']=='shipped']) == 2, final
    for repo in repos: assert subprocess.check_output(['sh','src/export.sh'],cwd=repo,text=True).strip()=='a,b'
    assert any(i['status']=='candidate' for i in final['items']), final
    receipts.append({'check':'real redrive checks and ships both items; discovery candidates remain unpromoted', 'summary':final['summary']})
    # Retained, clearly test-labelled candidates exercise pagination without inventing shipped history.
    seed = "import {openStore} from './src/store.ts'; const s=openStore(process.env.MW_HOME+'/madewell.db'); for(let n=0;n<100;n++) s.create({title:'Pagination candidate '+n,objective:'test pagination',source:'acceptance fixture',workspace:" + json.dumps(str(repos[0])) + ",status:'candidate'});s.close();"
    subprocess.run(['node','--input-type=module','-e',seed],cwd=checkout,env=env,check=True)
    command('resize-window','-t',name+':0','-x','110','-y','35')
    keys('node ' + cli + ' watch --workspace ' + str(repos[0]), 'Enter')
    wait_screen(lambda s: 'MADE WELL' in s and 'Staging 102' in s, 'long recorded queue count',10)
    keys('G')
    wait_screen(lambda s: 'ACTIVITY' in s, 'end of long history reachable',10)
    keys('q')
    receipts.append({'check':'watch remains read-only', 'itemsBefore':len(final['items'])+100, 'itemsAfter':len(mw(repos[0],'status')['items'])})
    assert len(mw(repos[0],'status')['items']) == len(final['items'])+100
    target=checkout/'.watch-review/tmux-evidence.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps({'passed':True,'checks':receipts},indent=2))
    print(json.dumps({'passed':True,'checks':[r['check'] for r in receipts],'evidence':str(target)}))
except Exception:
    failure = checkout/'.watch-review/tmux-failure.json'
    try: last_screen=capture()
    except Exception: last_screen='unavailable'
    failure.write_text(json.dumps({'screen':last_screen,'runner':(root/'runner.log').read_text(errors='replace') if (root/'runner.log').exists() else '', 'checks':receipts},indent=2))
    raise
finally:
    if runner and runner.poll() is None: runner.terminate(); runner.wait(timeout=15)
    subprocess.run(['tmux','kill-session','-t',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if control:
        try: control.wait(timeout=5)
        except subprocess.TimeoutExpired: control.terminate(); control.wait(timeout=5)
    shutil.rmtree(root)
