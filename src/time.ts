export function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

// Monday = start of ISO week (00:00 local)
export function startOfISOWeek(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay(); // 0=Sun,1=Mon,...
    const diff = (day + 6) % 7; // 0 for Mon, 6 for Sun
    x.setDate(x.getDate() - diff);
    return x;
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

export function formatLocalDDMMYYYYHHmm(d: Date): string {
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const HH = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${dd}/${mm}/${yyyy} ${HH}:${min}`;
}

export function relativeHM(from: Date, to: Date): string {
    const deltaMs = Math.max(0, to.getTime() - from.getTime());
    const totalMinutes = Math.floor(deltaMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hours ${minutes} minutes ago`;
}
