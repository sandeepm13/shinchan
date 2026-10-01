(() => {
    const $ = (s, r = document) => r.querySelector(s);
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shin = $('#shin');
    const hop = $('.shin-hop');
    const flip = $('.shin-flip');
    const eyes = $('#shin-eyes');
    const headTilt = $('.head-tilt');
    const bubble = $('.bubble');
    const shiro = $('#shiro');
    const shiroFlip = $('.shiro-flip');
    const counters = document.querySelectorAll('[data-count]');

    // ---------- layout ----------
    let vw, vh, W, H, SW, SH;
    function measure() {
        vw = innerWidth;
        vh = innerHeight;
        W = shin.offsetWidth;
        H = shin.offsetHeight;
        SW = shiro.offsetWidth;
        SH = shiro.offsetHeight;
    }
    measure();
    addEventListener('resize', measure);

    const minY = () => H + 120;      // keep head + bubble below the header
    const maxY = () => vh - 8;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // (x, y) is the point between his feet
    const s = {
        x: vw < 760 ? vw * 0.5 : vw * 0.74,
        y: vh - Math.min(vh * 0.1, 70),
        vx: 0, vy: 0,
        dir: -1, lean: 0,
        side: 1,
        busyUntil: 0,
    };
    const pointer = { x: vw * 0.3, y: vh * 0.3, active: false };
    let lastActivity = performance.now();
    let idleTurn = 0;

    // ---------- Chocobi count ----------
    let count = 0;
    try { count = parseInt(localStorage.getItem('chocobi-count'), 10) || 0; } catch (e) {}
    function renderCount(bump) {
        counters.forEach(el => {
            el.textContent = count;
            if (bump) {
                const target = el.closest('.counter') || el;
                target.classList.remove('bump');
                void target.offsetWidth;
                target.classList.add('bump');
            }
        });
    }
    renderCount(false);

    // ---------- speech + actions ----------
    let bubbleTimer = 0;
    let bubbleWidth = 0;
    function say(text, ms = 2400) {
        bubble.textContent = text;
        bubble.classList.add('show');
        bubbleWidth = bubble.offsetWidth;
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
    }

    const ACTS = ['wave', 'beam', 'dance', 'peppers', 'eat'];
    let actTimer = 0;
    function act(name, ms, freeze = true) {
        ACTS.forEach(a => shin.classList.remove('act-' + a));
        void shin.offsetWidth;
        shin.classList.add('act-' + name);
        if (freeze) s.busyUntil = performance.now() + ms;
        clearTimeout(actTimer);
        actTimer = setTimeout(() => shin.classList.remove('act-' + name), ms);
    }

    function jump() {
        hop.classList.remove('jump', 'pop-in');
        void hop.offsetWidth;
        hop.classList.add('jump');
    }

    // ---------- snacks ----------
    const snacks = [];
    function dropSnack(x, y) {
        if (snacks.length >= 6) {
            say('Hold on, I only have one mouth!', 1800);
            return;
        }
        x = clamp(x, 24, vw - 24);
        y = clamp(y, 90, vh - 20);
        const el = document.createElement('div');
        el.className = 'snack';
        el.innerHTML = '<svg aria-hidden="true"><use href="#chocobi"/></svg>';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        snacks.push({ x, y, el });
        if (snacks.length === 1 && Math.random() < 0.6) say('Chocobi!!', 1200);
    }

    function crumbs(x, y) {
        if (reduceMotion) return;
        for (let i = 0; i < 7; i++) {
            const c = document.createElement('span');
            c.className = 'crumb';
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            const a = Math.random() * Math.PI * 2;
            const r = 24 + Math.random() * 30;
            c.style.setProperty('--dx', Math.cos(a) * r + 'px');
            c.style.setProperty('--dy', Math.sin(a) * r - 20 + 'px');
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 650);
        }
    }

    const YUM = ['Yummy~', 'Chocobi is the best!', 'One more!', 'Mmm, crunchy.', "Don't tell Mom~"];
    function eat(snack) {
        snacks.splice(snacks.indexOf(snack), 1);
        snack.el.classList.add('gone');
        setTimeout(() => snack.el.remove(), 400);
        crumbs(snack.x, snack.y);
        count++;
        try { localStorage.setItem('chocobi-count', count); } catch (e) {}
        renderCount(true);
        act('eat', 850);
        say(YUM[Math.floor(Math.random() * YUM.length)], 1500);
    }

    function nearestSnack() {
        let best = null, bd = Infinity;
        for (const sn of snacks) {
            const d = Math.hypot(sn.x - s.x, sn.y - s.y);
            if (d < bd) { bd = d; best = sn; }
        }
        return best;
    }

    // ---------- input ----------
    function activity() { lastActivity = performance.now(); }

    addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return; // handled by touch events
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
        activity();
    }, { passive: true });

    function fromTouch(e) {
        const t = e.touches[0];
        if (!t) return;
        pointer.x = t.clientX;
        pointer.y = t.clientY;
        pointer.active = true;
        activity();
    }
    addEventListener('touchstart', fromTouch, { passive: true });
    addEventListener('touchmove', fromTouch, { passive: true });

    // keyboard users: he walks over to whatever has focus
    document.addEventListener('focusin', e => {
        if (!e.target.matches(':focus-visible')) return;
        const r = e.target.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        pointer.x = r.left + r.width / 2;
        pointer.y = r.top + r.height / 2;
        pointer.active = true;
        activity();
    });

    addEventListener('scroll', activity, { passive: true });

    const TICKLE = ['Hey hey, that tickles~', 'Ehehehe~', 'Ora! Personal space!', 'Are you a pretty lady?'];
    document.addEventListener('click', e => {
        activity();
        if (e.target.closest('a, button, input, select, textarea, label')) return;
        const r = shin.getBoundingClientRect();
        const pad = 8;
        if (e.clientX > r.left - pad && e.clientX < r.right + pad &&
            e.clientY > r.top - pad && e.clientY < r.bottom + pad) {
            jump();
            say(TICKLE[Math.floor(Math.random() * TICKLE.length)], 1800);
            return;
        }
        dropSnack(e.clientX, e.clientY);
    });

    // line buttons
    document.querySelectorAll('[data-say]').forEach(btn => {
        btn.addEventListener('click', () => {
            const kind = btn.dataset.act;
            say(btn.dataset.say, kind === 'peppers' ? 3400 : 2600);
            if (kind === 'wave') { act('wave', 1600); jump(); }
            if (kind === 'beam') act('beam', 2000);
            if (kind === 'dance') act('dance', 2600);
            if (kind === 'peppers') act('peppers', 2200);
            if (kind === 'snack') {
                const off = (Math.random() < 0.5 ? -1 : 1) * (W * 0.9 + Math.random() * 80);
                dropSnack(clamp(s.x + off, 30, vw - 30), clamp(s.y - 20, minY(), maxY()));
            }
        });
    });

    $('#drop-near').addEventListener('click', () => {
        const off = (Math.random() < 0.5 ? -1 : 1) * (W + Math.random() * 120);
        let x = s.x + off;
        if (x < 30 || x > vw - 30) x = s.x - off;
        dropSnack(x, s.y - 20 - Math.random() * 60);
    });

    // family photos flip; Shin-chan comments
    document.querySelectorAll('.photo').forEach(p => {
        p.addEventListener('click', () => {
            const on = p.getAttribute('aria-pressed') !== 'true';
            p.setAttribute('aria-pressed', on);
            if (on) {
                say(p.dataset.shin, 2200);
                if (p.dataset.shiro === 'cotton') {
                    shiro.classList.remove('cotton');
                    void shiro.offsetWidth;
                    shiro.classList.add('cotton');
                    setTimeout(() => shiro.classList.remove('cotton'), 1450);
                }
            }
        });
    });

    // ---------- the loop ----------
    const sh = { x: s.x + W, y: s.y, dir: -1 };
    let last = performance.now();

    function frame(now) {
        const dt = Math.min((now - last) / 16.667, 3);
        last = now;

        const busy = now < s.busyUntil;
        const snack = nearestSnack();
        let goal = null;
        let stop = 0;
        let maxSpeed = W * 0.055;
        let look = pointer.active ? pointer : { x: vw * 0.25, y: vh * 0.3 };

        if (snack) {
            goal = { x: snack.x, y: clamp(snack.y + 14, minY(), maxY()) };
            stop = 4;
            maxSpeed = W * 0.095;
            look = snack;
        } else if (pointer.active) {
            // stand beside the cursor, not on top of it; switch sides with some hysteresis
            const rel = s.x - pointer.x;
            if (Math.abs(rel) > W * 0.35) s.side = Math.sign(rel);
            goal = {
                x: pointer.x + s.side * W * 0.72,
                y: pointer.y + H * 0.5,
            };
            stop = 6;
        }

        let dvx = 0, dvy = 0;
        if (goal && !busy) {
            goal.x = clamp(goal.x, W * 0.5, vw - W * 0.5);
            goal.y = clamp(goal.y, minY(), maxY());
            const dx = goal.x - s.x;
            const dy = goal.y - s.y;
            const d = Math.hypot(dx, dy);
            if (d > stop) {
                const sp = Math.min(maxSpeed, (d - stop) * 0.12);
                dvx = dx / d * sp;
                dvy = dy / d * sp;
            }
            if (snack && d < 18) eat(snack);
        }

        const k = 1 - Math.pow(1 - 0.16, dt);
        s.vx += (dvx - s.vx) * k;
        s.vy += (dvy - s.vy) * k;
        s.x = clamp(s.x + s.vx * dt, W * 0.5, vw - W * 0.5);
        s.y = clamp(s.y + s.vy * dt, minY(), maxY());

        const speed = Math.hypot(s.vx, s.vy);
        const walking = speed > 0.5;
        shin.classList.toggle('walking', walking);
        shin.classList.toggle('running', speed > W * 0.06);

        // facing
        if (walking && Math.abs(s.vx) > 0.35) s.dir = Math.sign(s.vx);
        else if (!walking && Math.abs(look.x - s.x) > 12) s.dir = Math.sign(look.x - s.x);

        const targetLean = clamp(s.vx * 1.4, -12, 12);
        s.lean += (targetLean - s.lean) * k;

        shin.style.transform = `translate3d(${s.x - W / 2}px, ${s.y - H}px, 0)`;
        flip.style.transform = `scaleX(${s.dir}) rotate(${s.lean * s.dir}deg)`;

        // eyes and head follow whatever he's looking at
        const scale = W / 200;
        const ex = s.x + s.dir * 34 * scale;
        const ey = s.y - H + 77 * (H / 250);
        const lx = look.x - ex;
        const ly = look.y - ey;
        const ll = Math.hypot(lx, ly) || 1;
        eyes.style.transform = `translate(${(lx / ll) * 4.5 * s.dir}px, ${(ly / ll) * 3.5}px)`;
        headTilt.style.transform = `rotate(${clamp((ly / ll) * 9, -9, 7)}deg)`;

        // keep the bubble on screen
        if (bubble.classList.contains('show')) {
            const left = s.x - bubbleWidth / 2;
            const fixed = clamp(left, 8, vw - bubbleWidth - 8);
            bubble.style.setProperty('--shift', (fixed - left) + 'px');
        }

        // idle antics
        if (!reduceMotion && !walking && !busy && !snacks.length && now - lastActivity > 7000) {
            lastActivity = now;
            idleTurn++;
            if (idleTurn % 2) { act('dance', 2600); say('Buri buri~ buri buri~', 2600); }
            else { say(['Boooored. Play with me!', 'Is it snack time yet?', 'Ho hooon~'][idleTurn % 3], 2400); }
        }

        // Shiro trails a step behind
        const sgx = clamp(s.x - s.dir * W * 0.62, SW / 2, vw - SW / 2);
        const sgy = s.y;
        const sdx = sgx - sh.x;
        const sdy = sgy - sh.y;
        const sk = 1 - Math.pow(1 - 0.07, dt);
        sh.x += sdx * sk;
        sh.y += sdy * sk;
        const trot = Math.abs(sdx) + Math.abs(sdy) > 6;
        if (trot && Math.abs(sdx) > 2) sh.dir = Math.sign(sdx);
        else if (!trot) sh.dir = Math.sign(s.x - sh.x) || sh.dir;
        shiro.classList.toggle('trot', trot);
        shiro.style.transform = `translate3d(${sh.x - SW / 2}px, ${sh.y - SH}px, 0)`;
        shiroFlip.style.transform = `scaleX(${sh.dir})`;

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // ---------- entrance ----------
    setTimeout(() => {
        if (!reduceMotion) hop.classList.add('pop-in');
        act('wave', 1600, false);
        say('Ora, Shin-chan desu!', 2600);
    }, 350);
})();
