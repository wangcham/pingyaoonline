import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
function check(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const path=join(directory,entry.name);
    if(entry.isDirectory())check(path);
    else if(entry.name.endsWith('.js')) {
      const result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
      if(result.status!==0)process.exit(result.status||1);
    }
  }
}
check(fileURLToPath(new URL('../dist',import.meta.url)));
console.log('All scene and landmark modules passed syntax validation.');
