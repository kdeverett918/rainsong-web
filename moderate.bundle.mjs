import{existsSync as X}from"node:fs";import{DatabaseSync as D}from"node:sqlite";import{mkdirSync as U}from"node:fs";import{dirname as C}from"node:path";function m(r){r!==":memory:"&&U(C(r),{recursive:!0});let e=new D(r);e.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=FULL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS friendships (
      a TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      b TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, PRIMARY KEY(a,b), CHECK(a < b)
    );
    CREATE TABLE IF NOT EXISTS invites (
      code_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, claimed_by TEXT, claimed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS invites_owner ON invites(owner_id);
    CREATE TABLE IF NOT EXISTS paintings (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, seed INTEGER NOT NULL,
      scroll INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
      turn INTEGER NOT NULL DEFAULT 1, for_idx INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, ledger TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '[]', member_ids TEXT NOT NULL,
      roster TEXT NOT NULL, inks TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      painting_id TEXT NOT NULL REFERENCES paintings(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL, slot INTEGER NOT NULL, left_at INTEGER,
      PRIMARY KEY(painting_id,player_id), UNIQUE(painting_id,slot)
    );
    CREATE INDEX IF NOT EXISTS memberships_player ON memberships(player_id,left_at);
    CREATE TABLE IF NOT EXISTS operations (
      player_id TEXT NOT NULL, scope TEXT NOT NULL, nonce TEXT NOT NULL,
      request_hash TEXT NOT NULL, painting_id TEXT NOT NULL REFERENCES paintings(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, PRIMARY KEY(player_id,scope,nonce)
    );
    CREATE TABLE IF NOT EXISTS blocks (
      owner_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      target_name TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(owner_id,target_id), CHECK(owner_id != target_id)
    );
    CREATE INDEX IF NOT EXISTS blocks_target ON blocks(target_id);
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL, target_id TEXT NOT NULL,
      reason TEXT NOT NULL, thread_id TEXT NOT NULL, evidence TEXT NOT NULL,
      created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS reports_reporter ON reports(reporter_id,created_at);
    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, target_id TEXT NOT NULL,
      report_id TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);let t=new Set(e.prepare("PRAGMA table_info(players)").all().map(i=>i.name));return d(e,()=>{t.has("terms_version")||e.exec("ALTER TABLE players ADD COLUMN terms_version TEXT NOT NULL DEFAULT ''"),t.has("terms_accepted_at")||e.exec("ALTER TABLE players ADD COLUMN terms_accepted_at INTEGER"),t.has("banned_at")||e.exec("ALTER TABLE players ADD COLUMN banned_at INTEGER"),e.exec("PRAGMA user_version=2")}),e}function d(r,e){r.exec("BEGIN IMMEDIATE");try{let t=e();return r.exec("COMMIT"),t}catch(t){throw r.exec("ROLLBACK"),t}}import{createHash as Y,randomBytes as y}from"node:crypto";var u=class extends Error{constructor(e,t,i,a={}){super(i),this.status=e,this.code=t,this.extra=a}},n=(r,e,t,i)=>{throw new u(r,e,t,i)};var c=(r=6)=>y(r).toString("hex");function F(r){return(!r||typeof r!="object"||Array.isArray(r))&&n(400,"invalid_input","Expected an object."),r}function L(r,e){F(r),Object.keys(r).some(t=>!e.includes(t))&&n(400,"invalid_input","Unexpected field.")}var f=(r,e)=>r<e?[r,e]:[e,r];var N="2026-10-16",v=["harassment","inappropriate","spam","other"],w=90*864e5,_=r=>((typeof r!="string"||!/^[a-f0-9]{12}$/.test(r))&&n(400,"invalid_input","Invalid player."),r);function M(r,e,t,i){r.prepare(`UPDATE paintings SET state='closed',revision=revision+1,updated_at=? WHERE state='active'
    AND turn <= CASE WHEN scroll=4 THEN 8 ELSE 10 END
    AND id IN (SELECT painting_id FROM memberships WHERE player_id=? AND left_at IS NULL)
    AND id IN (SELECT painting_id FROM memberships WHERE player_id=? AND left_at IS NULL)`).run(i,e,t)}var R=class{constructor(e,t=Date.now){this.db=e,this.now=t,this.prune()}prune(){let e=this.now()-w;this.db.prepare("DELETE FROM reports WHERE created_at<?").run(e),this.db.prepare("DELETE FROM moderation_actions WHERE created_at<?").run(e)}requireTerms(e){let t=this.db.prepare("SELECT terms_version,banned_at FROM players WHERE id=?").get(e);t||n(401,"unauthorized","Please reconnect your friends profile."),t.banned_at!==null&&n(403,"account_restricted","This friends profile is unavailable."),t.terms_version!==N&&n(403,"terms_required","Please read and accept the community rules.",{termsVersion:N})}acceptTerms(e,t){return L(t,["termsVersion"]),t.termsVersion!==N&&n(400,"invalid_terms","Please read the current community rules.",{termsVersion:N}),this.db.prepare("UPDATE players SET terms_version=?,terms_accepted_at=? WHERE id=? AND banned_at IS NULL").run(N,this.now(),e),this.requireTerms(e),{accepted:!0,termsVersion:N}}blocked(e,t){return!!this.db.prepare("SELECT 1 FROM blocks WHERE (owner_id=? AND target_id=?) OR (owner_id=? AND target_id=?)").get(e,t,t,e)}assertPair(e,t){this.blocked(e,t)&&n(403,"blocked","These players cannot connect.")}assertGroup(e){for(let t=0;t<e.length;t++)for(let i=t+1;i<e.length;i++)this.assertPair(e[t],e[i]);for(let t of e)this.db.prepare("SELECT 1 FROM players WHERE id=? AND banned_at IS NULL").get(t)||n(403,"player_unavailable","A painter is unavailable.")}knownTarget(e,t,i){if(e===t&&n(400,"invalid_input","Choose another player."),i!==void 0)(typeof i!="string"||!/^[a-f0-9]{12}$/.test(i))&&n(400,"invalid_input","Invalid painting."),this.db.prepare(`SELECT 1 FROM memberships a JOIN memberships b ON a.painting_id=b.painting_id
        WHERE a.player_id=? AND b.player_id=? AND a.painting_id=? AND a.left_at IS NULL`).get(e,t,i)||n(403,"target_not_available","This player is not available to report.");else{let s=this.db.prepare("SELECT 1 FROM friendships WHERE a=? AND b=?").get(...f(e,t)),o=this.db.prepare(`SELECT 1 FROM memberships a JOIN memberships b ON a.painting_id=b.painting_id
        WHERE a.player_id=? AND b.player_id=? AND a.left_at IS NULL LIMIT 1`).get(e,t),T=this.db.prepare("SELECT 1 FROM blocks WHERE owner_id=? AND target_id=?").get(e,t);!s&&!o&&!T&&n(403,"target_not_available","This player is not available.")}let a=this.db.prepare("SELECT id,name FROM players WHERE id=?").get(t);return a||n(403,"target_not_available","This player is not available."),a}listBlocks(e){return{blocks:this.db.prepare("SELECT target_id AS id,target_name AS name FROM blocks WHERE owner_id=? ORDER BY created_at DESC,target_id").all(e).map(t=>({id:t.id,name:t.name}))}}block(e,t){L(t,["playerId"]);let i=_(t.playerId);return d(this.db,()=>{let a=this.knownTarget(e,i);return this.db.prepare("SELECT count(*) AS n FROM blocks WHERE owner_id=?").get(e).n>=500&&!this.db.prepare("SELECT 1 FROM blocks WHERE owner_id=? AND target_id=?").get(e,i)&&n(409,"block_limit","Your block list is full."),this.db.prepare("INSERT OR IGNORE INTO blocks(owner_id,target_id,target_name,created_at) VALUES(?,?,?,?)").run(e,i,a.name,this.now()),this.db.prepare("DELETE FROM friendships WHERE a=? AND b=?").run(...f(e,i)),M(this.db,e,i,this.now()),{blocked:!0}})}unblock(e,t){return _(t),this.db.prepare("DELETE FROM blocks WHERE owner_id=? AND target_id=?").run(e,t),{unblocked:!0}}report(e,t){L(t,["targetId","reason","threadId"]);let i=_(t.targetId);return v.includes(t.reason)||n(400,"invalid_input","Choose a report reason."),d(this.db,()=>{let a=this.knownTarget(e,i,t.threadId);this.prune();let s=this.db.prepare("SELECT id FROM reports WHERE reporter_id=? AND target_id=? AND reason=? AND thread_id=? AND created_at>?").get(e,i,t.reason,t.threadId??"",this.now()-864e5);if(s)return{reported:!0,reportId:s.id};this.db.prepare("SELECT count(*) AS n FROM reports WHERE reporter_id=? AND created_at>?").get(e,this.now()-864e5).n>=10&&n(429,"report_limit","Your reports have been received. Please try again later."),this.db.prepare("SELECT count(*) AS n FROM reports").get().n>=1e4&&n(503,"reports_busy","Please try reporting again shortly.");let o={target:{id:a.id,name:a.name},threadId:t.threadId??null,notes:[]};if(t.threadId){let A=this.db.prepare("SELECT notes,revision FROM paintings WHERE id=?").get(t.threadId),S=this.db.prepare("SELECT slot FROM memberships WHERE painting_id=? AND player_id=?").get(t.threadId,i).slot;o.revision=A.revision,o.notes=JSON.parse(A.notes).filter(O=>O.by===S).slice(-10).map(({turn:O,note:b,reaction:g})=>({turn:O,note:[...b].slice(0,90).join(""),reaction:g}))}let T=JSON.stringify(o);Buffer.byteLength(T)>8192&&n(500,"report_evidence_limit","Please try reporting again shortly.");let l=c();return this.db.prepare("INSERT INTO reports(id,reporter_id,target_id,reason,thread_id,evidence,created_at) VALUES(?,?,?,?,?,?,?)").run(l,e,i,t.reason,t.threadId??"",T,this.now()),{reported:!0,reportId:l}})}ban(e,t){return _(e),_(t),d(this.db,()=>{this.db.prepare("SELECT 1 FROM reports WHERE id=? AND target_id=?").get(t,e)||n(404,"not_found","Matching report not found."),this.db.prepare("UPDATE players SET banned_at=?,name='Painter unavailable' WHERE id=?").run(this.now(),e).changes||n(404,"not_found","Profile not found."),this.db.prepare("DELETE FROM friendships WHERE a=? OR b=?").run(e,e),this.db.prepare("DELETE FROM invites WHERE owner_id=?").run(e);let a=this.db.prepare("SELECT p.id,p.roster,p.notes,m.slot FROM paintings p JOIN memberships m ON p.id=m.painting_id WHERE m.player_id=?").all(e);for(let s of a){let o=JSON.parse(s.roster);o[s.slot]="Painter unavailable";let T=JSON.parse(s.notes).filter(l=>l.by!==s.slot);this.db.prepare("UPDATE paintings SET roster=?,notes=?,state='closed',revision=revision+1,updated_at=? WHERE id=?").run(JSON.stringify(o),JSON.stringify(T),this.now(),s.id)}return this.db.prepare("UPDATE reports SET status='actioned',reviewed_at=? WHERE id=?").run(this.now(),t),this.db.prepare("INSERT INTO moderation_actions(id,action,target_id,report_id,created_at) VALUES(?,?,?,?,?)").run(c(),"ban",e,t,this.now()),{banned:!0,playerId:e,reportId:t}})}};var p=process.argv.slice(2),I=p.indexOf("--db"),h=I<0?process.env.FRIENDS_DB_PATH:p.splice(I,2)[1];if(!h||!X(h))throw new Error("An existing FRIENDS_DB_PATH or --db file is required.");var E=m(h),x=new R(E);try{let[r,e,t,i]=p,a;if(r==="list"&&p.length===1)a=E.prepare("SELECT id,target_id,reason,thread_id,created_at,status FROM reports WHERE status='pending' ORDER BY created_at LIMIT 100").all();else if(r==="show"&&p.length===2&&/^[a-f0-9]{12}$/.test(e)){let s=E.prepare("SELECT * FROM reports WHERE id=?").get(e);if(!s)throw new Error("Report not found.");a={...s,evidence:JSON.parse(s.evidence)}}else if(r==="resolve"&&p.length===3&&/^[a-f0-9]{12}$/.test(e)&&["reviewed","dismissed"].includes(t))a=d(E,()=>{let s=E.prepare("SELECT target_id FROM reports WHERE id=?").get(e);if(!s)throw new Error("Report not found.");let o=Date.now();return E.prepare("UPDATE reports SET status=?,reviewed_at=? WHERE id=?").run(t,o,e),E.prepare("INSERT INTO moderation_actions(id,action,target_id,report_id,created_at) VALUES(?,?,?,?,?)").run(c(),t,s.target_id,e,o),{reportId:e,status:t}});else if(r==="ban"&&p.length===4&&t==="--report")a=x.ban(e,i);else throw new Error("Usage: moderate [--db existing.sqlite] list | show REPORT | resolve REPORT reviewed|dismissed | ban PLAYER --report REPORT");console.log(JSON.stringify(a,null,2))}finally{E.close()}
