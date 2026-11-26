// x is east, z is south. Coordinates are local meters near Pingyao.
export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax=ring[j][0],az=ring[j][1],bx=ring[i][0],bz=ring[i][1];
    if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
  }
  return inside;
}

export function segments(points) {
  return points.slice(1).flatMap((end, i) => {
    const start = points[i];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    return length > .04 ? [{start, end, length}] : [];
  });
}

export function sample(segment, t) {
  return segment.start.map((value, axis) => value + (segment.end[axis] - value) * t);
}

export function projectOnSegment(point, segment) {
  const dx = segment.end[0] - segment.start[0];
  const dz = segment.end[1] - segment.start[1];
  const fraction = ((point[0] - segment.start[0]) * dx + (point[1] - segment.start[1]) * dz) / (segment.length ** 2);
  const t = Math.max(0, Math.min(1, fraction));
  const x=segment.start[0]+dx*t,z=segment.start[1]+dz*t;
  return {t, distance: Math.hypot(point[0] - x, point[1] - z)};
}

// For immutable survey outlines: reject distant points using the cached bounds
// before polygon/edge checks. This does not simplify or move the source ring.
export function createRingQuery(ring){
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(const p of ring){bounds[0]=Math.min(bounds[0],p[0]);bounds[1]=Math.min(bounds[1],p[1]);bounds[2]=Math.max(bounds[2],p[0]);bounds[3]=Math.max(bounds[3],p[1]);}
 const edges=segments([...ring,ring[0]]);
 return {bounds,contains(x,z,pad=0,inclusive=false){
  if(x<bounds[0]-pad||x>bounds[2]+pad||z<bounds[1]-pad||z>bounds[3]+pad)return false;
  if(pointInRing(x,z,ring))return true;
  if(pad<=0&&!inclusive)return false;
  return edges.some(e=>{const d=projectOnSegment([x,z],e).distance;return inclusive?d<=pad:d<pad;});
 }};
}

export function locateGates(map) {
  const wall = segments(map.wall);
  const outward = {'北':[0,-1],'南':[0,1],'东':[1,0],'西':[-1,0]};
  const gates = map.gates.map(([direction, name, point]) => {
    const candidates = wall.map(segment => ({segment, ...projectOnSegment(point, segment)}));
    const nearest = candidates.reduce((a, b) => a.distance <= b.distance ? a : b);
    const center = sample(nearest.segment, nearest.t);
    if (name==='凤仪门') return {
      name,direction,center:map.lowerWestInnerGate,normal:[0,1],angle:Math.PI/2,
      spawn:[-1183,2.1,115],look:[-1175,3.1,82.5],
    };
    const normal = outward[direction];
    return {name, direction, center, normal, angle: normal[0] === 0 ? 0 : Math.PI/2};
  });
  return {wall, gates};
}

// A gate corridor can cross more than one line in the mapped barbican.
export function passageCut(line, gate) {
  const [x, z] = gate.center;
  const [nx] = gate.normal;
  const halfWidth = gate.cutSize ?? (nx === 0 ? [9, 80] : [80, 9]);
  let low = 0, high = 1;
  for (const [axis, center] of [x,z].entries()) {
    const start = line.start[axis] - center;
    const delta = line.end[axis] - line.start[axis];
    const limit = halfWidth[axis];
    if (Math.abs(delta) < .0001) {
      if (Math.abs(start) > limit) return null;
      continue;
    }
    const a = (-limit - start) / delta, b = (limit - start) / delta;
    low = Math.max(low, Math.min(a,b));
    high = Math.min(high, Math.max(a,b));
    if (low >= high) return null;
  }
  return [low,high];
}

export function makeGrid(size) {
  const cells = new Map();
  const key = (x, z) => `${Math.floor(x / size)},${Math.floor(z / size)}`;
  return {
    add(item, minX, minZ, maxX, maxZ) {
      for (let x = Math.floor(minX / size); x <= Math.floor(maxX / size); x++) {
        for (let z = Math.floor(minZ / size); z <= Math.floor(maxZ / size); z++) {
          const id = `${x},${z}`;
          if (!cells.has(id)) cells.set(id, []);
          cells.get(id).push(item);
        }
      }
    },
    at(x, z) { return cells.get(key(x, z)) ?? []; },
  };
}
