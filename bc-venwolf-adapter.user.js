// ==UserScript==
// @name         BC VenWolf Adapter
// @namespace    VenWolf-BondageClub
// @version      0.1.4
// @description  Send Bondage Club activity events to VenWolf/DG-Lab Game API.
// @author       QAQMOON
// @homepageURL  https://github.com/QAQMOON/-BC-VenWolf-Adapter
// @supportURL   https://github.com/QAQMOON/-BC-VenWolf-Adapter/issues
// @updateURL    https://raw.githubusercontent.com/QAQMOON/-BC-VenWolf-Adapter/main/bc-venwolf-adapter.user.js
// @downloadURL  https://raw.githubusercontent.com/QAQMOON/-BC-VenWolf-Adapter/main/bc-venwolf-adapter.user.js
// @match        https://bondageprojects.com/club_game*
// @match        https://www.bondageprojects.com/club_game*
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://bondage-asia.com/*
// @match        https://www.bondage-asia.com/*
// @match        https://bondage-asia.com/club/R*/*
// @match        https://www.bondage-asia.com/club/R*/*
// @include      /^https:\/\/(www\.)?bondage(projects\.elementfx|-(europe|asia))\.com\/.*$/
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @connect      cdn.jsdelivr.net
// ==/UserScript==

(function () {
    'use strict';

    const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const VERSION = '0.1.4';
    const SHORT = 'BC-VenWolf';
    const MOD_ID = 'BCVenWolfAdapter';
    const MOD_SDK_URL = 'https://cdn.jsdelivr.net/npm/bondage-club-mod-sdk@1.2.0/dist/bcmodsdk.js';
    const STORE_KEY = 'BC_VenWolf_Adapter_v1';
    const COMMAND = 'vw';
    const REQUEST_TIMEOUT_MS = 5000;

    if (W.__BC_VENWOLF_ADAPTER__) {
        console.warn(`[${SHORT}] already loaded.`);
        return;
    }
    W.__BC_VENWOLF_ADAPTER__ = { version: VERSION };

    const DEFAULT_SETTINGS = {
        enabled: true,
        baseUrl: 'http://127.0.0.1:8920',
        clientId: 'all',
        maxFireStrength: 60,
        minFireStrength: 5,
        maxDurationMs: 30000,
        defaultDurationMs: 5000,
        cooldownMs: 900,
        override: true,
        pulseId: '',
        triggerOnOther: true,
        useZoneFallback: true,
        showLocalMessages: true,
        dryRun: false,
        debugEvents: false,
    };

    const BODY_ZONE_SENS = {
        ItemMouth: 85,
        ItemEar: 90,
        ItemVulva: 100,
        ItemVulvaPiercings: 95,
        ItemBreast: 75,
        ItemNipples: 80,
        ItemButt: 65,
        ItemLegs: 50,
        ItemTorso: 45,
        ItemPelvis: 60,
        ItemArms: 40,
        ItemFeet: 35,
        ItemBoots: 30,
        ItemHands: 30,
        ItemHead: 55,
        ItemNeck: 70,
    };

    const ACTION_RULES = [
        rule('OnSelf', 12, 6000, ['*'], ['ItemAdded', 'ItemRemoved']),
        rule('OnSelf', 20, 12000, ['*'], ['ToyEvent', 'Vibration', 'Inflation']),
        rule('OnSelf', 75, 30000, ['*'], ['Orgasm', 'RuinedOrgasm', 'EdgeExplode', 'Edge']),
        rule('OnSelf', 70, 20000, ['ItemButt', 'ItemVulva', 'ItemVulvaPiercings'], ['Spank', 'SpankItem', 'Slap', 'Kick']),
        rule('OnSelf', 40, 20000, ['ItemMouth', 'ItemEar'], ['FrenchKiss', 'Kiss', 'Lick', 'Nibble', 'Bite']),
        rule('OnSelf', 25, 30000, ['ItemMouth'], ['Kiss', 'FrenchKiss', 'Lick', 'Caress', 'Grope', 'Pull', 'Massage', 'Rub']),
        rule('OnSelf', 25, 30000, ['ItemEar'], ['Kiss', 'Nibble', 'Lick', 'Bite', 'Caress', 'Grope', 'Pull', 'Massage', 'Rub']),
        rule('OnSelf', 25, 30000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemBreast', 'ItemNipples', 'ItemButt', 'ItemMouth', 'ItemEar'], ['Caress', 'Kiss', 'Grope', 'Pull', 'Massage', 'Lick', 'Rub']),
        rule('OnSelf', 25, 30000, ['*'], ['Cuddle', 'Pet', 'RestHead', 'Sit', 'Kiss', 'Lick']),
        rule('OnSelf', 25, 30000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemBreast', 'ItemNipples', 'ItemMouth'], ['RubItem'], ['SmallVibratingWand', 'ElectricToothbrush', 'SmallDildo', 'LargeDildo', 'VibratingWand', 'Vibrator']),
        rule('OnSelf', 30, 30000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemBreast', 'ItemNipples', 'ItemMouth'], ['MasturbateItem'], ['SmallVibratingWand', 'ElectricToothbrush', 'SmallDildo', 'LargeDildo', 'VibratingWand', 'Vibrator']),
        rule('OnSelf', 45, 30000, ['ItemButt'], ['ShockHigh'], ['ShockPlug']),
        rule('OnSelf', 35, 30000, ['ItemButt'], ['ShockMed'], ['ShockPlug']),
        rule('OnSelf', 25, 30000, ['ItemButt'], ['ShockLow'], ['ShockPlug']),
        rule('OnSelf', 35, 30000, ['ItemLegs'], ['ShockLow'], ['ElectricBox', '电击器']),
        rule('OnSelf', 30, 40000, ['ItemLegs'], ['ShockMed'], ['ElectricBox', '电击器']),
        rule('OnSelf', 45, 30000, ['ItemVulva'], ['ShockHigh'], ['ShockDildo']),
        rule('OnSelf', 35, 40000, ['ItemVulva'], ['ShockMed'], ['ShockDildo']),
        rule('OnSelf', 25, 40000, ['ItemVulva'], ['ShockLow'], ['ShockDildo']),
        rule('OnSelf', 35, 30000, ['ItemVulva'], ['ShockMed'], ['FuturisticVibrator']),
        rule('OnSelf', 40, 40000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemButt', 'ItemLegs'], ['SpankItem'], ['Whip']),
        rule('OnSelf', 35, 40000, ['ItemTorso', 'ItemPelvis', 'ItemBreast', 'ItemNipples'], ['SpankItem'], ['Whip']),
        rule('OnSelf', 30, 40000, ['ItemArms', 'ItemFeet', 'ItemBoots'], ['SpankItem'], ['Whip']),
        rule('OnSelf', 35, 50000, ['*'], ['SpankItem'], ['Flogger', 'Paddle']),
        rule('OnSelf', 30, 50000, ['*'], ['SpankItem'], ['WhipPaddle', 'Cane', 'Crop', 'HeartCrop']),
        rule('OnSelf', 35, 40000, ['*'], ['ShockItem', 'Slap']),
        rule('OnSelf', 30, 40000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemBreast', 'ItemNipples', 'ItemButt'], ['Spank', 'Kick']),
        rule('OnSelf', 25, 50000, ['ItemVulva', 'ItemVulvaPiercings', 'ItemButt', 'ItemBreast', 'ItemNipples'], ['Masturbate', 'MasturbateTongue', 'MasturbateFoot', 'MasturbateHand', 'Grope', 'PenetrateSlow', 'PenetrateFast']),
        rule('OnOther', 25, 20000, ['*'], ['PenetrateSlow']),
        rule('OnOther', 30, 40000, ['*'], ['PenetrateFast']),
    ];

    const IGNORE_CONTENT = new Set(['BCXMsg', 'BCEMsg', 'Preference', 'Wardrobe', 'SlowLeaveAttempt', 'ServerUpdateRoom', 'bctMsg']);
    const IGNORE_TYPE = new Set(['Status', 'Hidden']);
    const SHOCK_ACTIONS = ['ShockLow', 'ShockMed', 'ShockHigh'];

    let settings = loadSettings();
    let bcModApi = null;
    let sdkLoadingPromise = null;
    let patched = false;
    let eventPatched = false;
    let socketListenerRegistered = false;
    const runtime = {
        lastFireAt: 0,
        lastEventKey: '',
        requestOk: 0,
        requestFailed: 0,
        eventSeen: 0,
        eventTriggered: 0,
        lastEvent: '',
        lastSkip: '',
    };

    function rule(type, intensity, durationMs, names, actions, items) {
        return {
            type,
            intensity,
            durationMs,
            names,
            actions,
            items: items || ['*'],
        };
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return { ...DEFAULT_SETTINGS };
            return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch (error) {
            console.warn(`[${SHORT}] failed to load settings`, error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings() {
        localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    }

    function log(message, data) {
        if (data === undefined) {
            console.log(`[${SHORT}] ${message}`);
        } else {
            console.log(`[${SHORT}] ${message}`, data);
        }
    }

    function notify(message, durationMs) {
        log(message);
        if (!settings.showLocalMessages || typeof W.ChatRoomSendLocal !== 'function') return;
        W.ChatRoomSendLocal(`[VenWolf] ${message}`, durationMs || 8000);
    }

    function clampNumber(value, min, max) {
        const num = Number(value);
        if (!Number.isFinite(num)) return min;
        return Math.max(min, Math.min(max, num));
    }

    function normalizeUrl(value) {
        const url = String(value || '').trim().replace(/\/+$/, '');
        if (!/^https?:\/\/.+/i.test(url)) return '';
        return url;
    }

    function eventToKey(event) {
        return [event.type, event.slot || '', event.action || '', event.item || ''].join('|');
    }

    function describeEvent(event) {
        return `${event.type || '?'} ${event.slot || '*'} ${event.action || '*'} ${event.item || ''}`.trim();
    }

    function debugEvent(stage, data) {
        if (!settings.debugEvents) return;
        console.log(`[${SHORT}] ${stage}`, data);
    }

    function listMatches(list, value) {
        if (!Array.isArray(list) || list.includes('*')) return true;
        const target = String(value || '').toLowerCase();
        return list.some((item) => String(item).toLowerCase() === target);
    }

    function ruleScore(ruleDef, event) {
        let score = 0;
        if (ruleDef.type === event.type) score += 16;
        if (!ruleDef.names.includes('*')) score += 4;
        if (!ruleDef.actions.includes('*')) score += 4;
        if (!ruleDef.items.includes('*')) score += 2;
        return score;
    }

    function findRule(event) {
        let best = null;
        let bestScore = -1;
        for (const candidate of ACTION_RULES) {
            if (candidate.type !== event.type) continue;
            if (!listMatches(candidate.names, event.slot)) continue;
            if (!listMatches(candidate.actions, event.action)) continue;
            if (!listMatches(candidate.items, event.item)) continue;
            const score = ruleScore(candidate, event);
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
        return best;
    }

    function calcZoneIntensityPercent(slot, actionName) {
        const base = BODY_ZONE_SENS[slot] || 50;
        let actionBonus = 0;
        if (/Shock|Orgasm/i.test(actionName)) actionBonus = 20;
        else if (/Spank|Kick|Slap|Bite|Masturbate/i.test(actionName)) actionBonus = 10;
        else if (/Caress|Pet|Cuddle|Massage/i.test(actionName)) actionBonus = -5;
        return clampNumber(base + actionBonus, 5, 100);
    }

    function percentToFireStrength(percent) {
        if (percent <= 0) return 0;
        const maxStrength = clampNumber(settings.maxFireStrength, 1, 200);
        const minStrength = clampNumber(settings.minFireStrength, 0, maxStrength);
        return Math.round(clampNumber(percent, 0, 100) / 100 * (maxStrength - minStrength) + minStrength);
    }

    function capDuration(durationMs) {
        const maxDuration = clampNumber(settings.maxDurationMs, 1, 300000);
        return Math.round(clampNumber(durationMs || settings.defaultDurationMs, 1, maxDuration));
    }

    function buildFireUrl() {
        const baseUrl = normalizeUrl(settings.baseUrl);
        const clientId = String(settings.clientId || 'all').trim() || 'all';
        if (!baseUrl) throw new Error('Invalid VenWolf base URL');
        return `${baseUrl}/api/v2/game/${encodeURIComponent(clientId)}/action/fire`;
    }

    function sendJson(url, body) {
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(body),
                    timeout: REQUEST_TIMEOUT_MS,
                    onload: (response) => {
                        const text = response.responseText || '';
                        try {
                            resolve(text ? JSON.parse(text) : {});
                        } catch (error) {
                            reject(new Error(`Invalid JSON response: ${text.slice(0, 120)}`));
                        }
                    },
                    onerror: () => reject(new Error('Request failed')),
                    ontimeout: () => reject(new Error('Request timed out')),
                });
            });
        }

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).then((response) => response.json());
    }

    function requestText(url) {
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    timeout: REQUEST_TIMEOUT_MS,
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) resolve(response.responseText || '');
                        else reject(new Error(`HTTP ${response.status}`));
                    },
                    onerror: () => reject(new Error('Request failed')),
                    ontimeout: () => reject(new Error('Request timed out')),
                });
            });
        }

        return fetch(url, { cache: 'no-cache' }).then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        });
    }

    function loadModSdk() {
        if (W.bcModSdk && typeof W.bcModSdk.registerMod === 'function') return Promise.resolve(W.bcModSdk);
        if (sdkLoadingPromise) return sdkLoadingPromise;
        sdkLoadingPromise = requestText(MOD_SDK_URL).then((code) => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.textContent = `${code}\n//# sourceURL=${MOD_SDK_URL}`;
            (document.head || document.documentElement).appendChild(script);
            setTimeout(() => {
                script.remove();
                if (W.bcModSdk && typeof W.bcModSdk.registerMod === 'function') resolve(W.bcModSdk);
                else reject(new Error('BC Mod SDK loaded without bcModSdk'));
            }, 0);
        }));
        return sdkLoadingPromise;
    }

    function registerModSdk() {
        return loadModSdk()
            .then((sdk) => {
                if (bcModApi) return bcModApi;
                bcModApi = sdk.registerMod({
                    name: MOD_ID,
                    fullName: 'BC VenWolf Adapter',
                    version: VERSION,
                    repository: 'https://github.com/QAQMOON/-BC-VenWolf-Adapter',
                }, { allowReplace: true });
                log('BC Mod SDK registered');
                return bcModApi;
            })
            .catch((error) => {
                console.warn(`[${SHORT}] BC Mod SDK unavailable, using fallback hooks.`, error);
                return null;
            });
    }

    async function fireVenWolf(strength, durationMs, reason) {
        const finalStrength = Math.round(clampNumber(strength, 0, 200));
        if (!settings.enabled || finalStrength <= 0) return;

        const payload = {
            strength: finalStrength,
            time: capDuration(durationMs),
            override: settings.override === true,
        };
        if (settings.pulseId) payload.pulseId = settings.pulseId;

        if (settings.dryRun) {
            notify(`dry-run ${reason}: strength=${payload.strength}, time=${payload.time}, client=${settings.clientId}`, 5000);
            return;
        }

        const url = buildFireUrl();
        log(`POST ${url}`, payload);
        let result;
        try {
            result = await sendJson(url, payload);
        } catch (error) {
            runtime.requestFailed++;
            throw error;
        }

        if (!result || result.status !== 1) {
            runtime.requestFailed++;
            throw new Error(result && result.message ? result.message : 'VenWolf API returned a failure response');
        }
        runtime.requestOk++;
    }

    function canTrigger(event) {
        const now = Date.now();
        const eventKey = eventToKey(event);
        if (now - runtime.lastFireAt < settings.cooldownMs) return false;
        if (eventKey === runtime.lastEventKey && now - runtime.lastFireAt < settings.cooldownMs * 2) return false;
        runtime.lastFireAt = now;
        runtime.lastEventKey = eventKey;
        return true;
    }

    function dispatchGameEvent(event) {
        runtime.eventSeen++;
        runtime.lastEvent = describeEvent(event);
        debugEvent('event', event);

        if (!settings.enabled) return;
        if (event.type === 'OnOther' && !settings.triggerOnOther) return;

        const matchedRule = findRule(event);
        if (!matchedRule && !settings.useZoneFallback && !Number.isFinite(event.intensity)) {
            runtime.lastSkip = `no rule: ${runtime.lastEvent}`;
            return;
        }
        if (!canTrigger(event)) return;

        const percent = Number.isFinite(event.intensity)
            ? event.intensity
            : matchedRule
            ? matchedRule.intensity
            : calcZoneIntensityPercent(event.slot, event.action);
        const duration = Number.isFinite(event.durationMs)
            ? event.durationMs
            : matchedRule
            ? matchedRule.durationMs
            : settings.defaultDurationMs;
        const strength = percentToFireStrength(percent);
        const reason = `${event.type} ${event.slot || '*'} ${event.action || '*'} ${event.item || ''}`.trim();

        runtime.eventTriggered++;
        fireVenWolf(strength, duration, reason).catch((error) => {
            notify(`request failed: ${error.message}`, 8000);
        });
    }

    function sameMember(left, right) {
        return String(left || '') === String(right || '');
    }

    function playerMemberNumber() {
        return W.Player && W.Player.MemberNumber;
    }

    function sDict(message, tag, subKey) {
        if (!message || !Array.isArray(message.Dictionary)) return null;
        for (const entry of message.Dictionary) {
            const keys = Object.keys(entry);
            const values = Object.values(entry);
            if (keys[0] === tag) return values[0];
            const subIndex = keys.indexOf(subKey);
            if (keys[0] === 'Tag' && values[0] === tag && subIndex >= 0) return values[subIndex];
        }
        return null;
    }

    function firstDictValue(message, tag, subKeys) {
        for (const subKey of subKeys) {
            const value = sDict(message, tag, subKey);
            if (value !== null && value !== undefined && value !== '') return value;
        }
        const direct = sDict(message, tag);
        return direct === null || direct === undefined ? '' : direct;
    }

    function appearanceByAssetName(assetName) {
        const appearance = W.Player && W.Player.Appearance;
        if (!Array.isArray(appearance)) return null;
        return appearance.find((item) => item && item.Asset && item.Asset.Name === assetName) || null;
    }

    function appearanceBySlot(slot) {
        const appearance = W.Player && W.Player.Appearance;
        if (!Array.isArray(appearance)) return null;
        return appearance.find((item) => item && item.Asset && item.Asset.DynamicGroupName === slot) || null;
    }

    function assetGroupName(item) {
        if (!item || !item.Asset) return '';
        return item.Asset.DynamicGroupName
            || (item.Asset.Group && item.Asset.Group.Name)
            || '';
    }

    function itemPropertyNumber(item, keys) {
        if (!item || !item.Property) return null;
        for (const key of keys) {
            const value = item.Property[key];
            if (value !== null && value !== undefined && Number.isFinite(Number(value))) return Number(value);
        }
        return null;
    }

    function handleActivity(data) {
        if (data.Type !== 'Activity') return;
        const slot = firstDictValue(data, 'FocusAssetGroup', ['FocusGroupName', 'AssetGroupName', 'GroupName']);
        const action = firstDictValue(data, 'ActivityName', ['ActivityName', 'Text', 'Name']);
        const item = firstDictValue(data, 'ActivityAsset', ['AssetName', 'Name']) || '';
        const target = sDict(data, 'TargetCharacter', 'MemberNumber');
        const source = sDict(data, 'SourceCharacter', 'MemberNumber');

        if (!slot || !action) return;
        if (sameMember(target, playerMemberNumber())) {
            dispatchGameEvent({ type: 'OnSelf', slot, action, item, raw: data });
        } else if (sameMember(source, playerMemberNumber())) {
            dispatchGameEvent({ type: 'OnOther', slot, action, item, raw: data });
        }
    }

    function shockLevelFromAction(data) {
        switch (data.Content) {
            case 'TriggerShock0': return 0;
            case 'TriggerShock1': return 1;
            case 'TriggerShock2': return 2;
            default: return -1;
        }
    }

    function handleShockAction(data) {
        if (data.Type !== 'Action') return;
        const destination = sDict(data, 'DestinationCharacter', 'MemberNumber')
            || sDict(data, 'TargetCharacterName', 'MemberNumber')
            || sDict(data, 'DestinationCharacterName', 'MemberNumber');
        if (!sameMember(destination, playerMemberNumber())) return;

        const level = shockLevelFromAction(data);
        if (level < 0) return;

        const assetName = firstDictValue(data, 'AssetName', ['AssetName', 'Name'])
            || firstDictValue(data, 'ActivityAsset', ['AssetName', 'Name'])
            || '';
        const asset = appearanceByAssetName(assetName);
        const slot = firstDictValue(data, 'FocusAssetGroup', ['FocusGroupName', 'AssetGroupName', 'GroupName'])
            || (asset && asset.Asset && asset.Asset.DynamicGroupName)
            || '';

        dispatchGameEvent({
            type: 'OnSelf',
            slot,
            action: SHOCK_ACTIONS[level],
            item: assetName,
            raw: data,
        });
    }

    function handleItemEquip(data) {
        if (data.Type !== 'Action') return;
        const destination = sDict(data, 'DestinationCharacter', 'MemberNumber');
        const source = sDict(data, 'SourceCharacter', 'MemberNumber');
        if (!sameMember(destination, playerMemberNumber()) || sameMember(source, playerMemberNumber())) return;

        const slot = firstDictValue(data, 'FocusAssetGroup', ['FocusGroupName', 'AssetGroupName', 'GroupName']);
        if (!slot) return;

        if (data.Content === 'ActionUse') {
            const item = firstDictValue(data, 'NextAsset', ['AssetName', 'Name']);
            if (!item) return;
            dispatchGameEvent({
                type: 'OnSelf',
                slot,
                action: 'ItemAdded',
                item,
                intensity: 12,
                durationMs: 6000,
                raw: data,
            });
        } else if (data.Content === 'ActionRemove') {
            const item = firstDictValue(data, 'PrevAsset', ['AssetName', 'Name']);
            if (!item) return;
            dispatchGameEvent({
                type: 'OnSelf',
                slot,
                action: 'ItemRemoved',
                item,
                intensity: 8,
                durationMs: 3000,
                raw: data,
            });
        }
    }

    function handleToyAssetState(item, actionName, raw) {
        const slot = assetGroupName(item);
        const itemName = item && item.Asset && item.Asset.Name || '';
        if (!slot || !itemName) return false;

        const shockLevel = itemPropertyNumber(item, ['ShockLevel']);
        if (shockLevel !== null && shockLevel >= 0) {
            dispatchGameEvent({
                type: 'OnSelf',
                slot,
                action: SHOCK_ACTIONS[Math.max(0, Math.min(2, Math.round(shockLevel)))] || 'ShockLow',
                item: itemName,
                intensity: Math.max(20, Math.min(60, (shockLevel + 1) * 20)),
                durationMs: 8000,
                raw,
            });
            return true;
        }

        const vibrationLevel = itemPropertyNumber(item, ['Intensity', 'VibrationLevel']);
        if (vibrationLevel !== null && vibrationLevel >= 0) {
            dispatchGameEvent({
                type: 'OnSelf',
                slot,
                action: actionName || 'Vibration',
                item: itemName,
                intensity: Math.max(10, Math.min(100, (vibrationLevel + 1) * 20)),
                durationMs: settings.defaultDurationMs,
                raw,
            });
            return true;
        }

        const inflateLevel = itemPropertyNumber(item, ['InflateLevel', 'InflationLevel']);
        if (inflateLevel !== null && inflateLevel > 0) {
            dispatchGameEvent({
                type: 'OnSelf',
                slot,
                action: actionName || 'Inflation',
                item: itemName,
                intensity: Math.max(10, Math.min(100, inflateLevel * 20)),
                durationMs: settings.defaultDurationMs,
                raw,
            });
            return true;
        }

        return false;
    }

    function handleToyEvents(data) {
        if (data.Type !== 'Action') return;
        const destination = sDict(data, 'DestinationCharacter', 'MemberNumber')
            || sDict(data, 'DestinationCharacterName', 'MemberNumber')
            || sDict(data, 'TargetCharacterName', 'MemberNumber');
        if (!sameMember(destination, playerMemberNumber())) return;

        const assetName = firstDictValue(data, 'AssetName', ['AssetName', 'Name'])
            || firstDictValue(data, 'ActivityAsset', ['AssetName', 'Name'])
            || '';
        const asset = appearanceByAssetName(assetName);
        const shockLevel = shockLevelFromAction(data);
        if (shockLevel >= 0 && asset) {
            handleToyAssetState({
                ...asset,
                Property: {
                    ...(asset.Property || {}),
                    ShockLevel: shockLevel,
                },
            }, SHOCK_ACTIONS[shockLevel], data);
            return;
        }

        if (asset) {
            handleToyAssetState(asset, 'ToyEvent', data);
        }
    }

    function handlePortalLink(data) {
        if (data.Type !== 'Action') return;
        const slot = firstDictValue(data, 'FocusAssetGroup', ['FocusGroupName', 'AssetGroupName', 'GroupName']);
        const item = firstDictValue(data, 'AssetName', ['AssetName', 'Name']);
        const target = sDict(data, 'TargetCharacter', 'MemberNumber');
        const source = sDict(data, 'SourceCharacter', 'MemberNumber');
        let action = null;

        switch (data.Content) {
            case 'PortalLinkFunctionActivityCaress': action = 'Caress'; break;
            case 'PortalLinkFunctionActivityKiss': action = 'Kiss'; break;
            case 'PortalLinkFunctionActivityMasturbateHand': action = 'MasturbateHand'; break;
            case 'PortalLinkFunctionActivitySlap': action = 'Slap'; break;
            case 'PortalLinkFunctionActivityMasturbateTongue': action = 'MasturbateTongue'; break;
            default: break;
        }

        if (!slot || !action || item !== 'PortalPanties') return;
        if (sameMember(target, playerMemberNumber())) {
            dispatchGameEvent({ type: 'OnSelf', slot, action, item, raw: data });
        } else if (sameMember(source, playerMemberNumber())) {
            dispatchGameEvent({ type: 'OnOther', slot, action, item, raw: data });
        }
    }

    function handleCustomLevel(slot, item, content, itemRegex, offRegex, lowRegex, medRegex, highRegex, maxRegex) {
        if (!itemRegex.test(content)) return;
        let level = -1;
        if (offRegex.test(content)) level = 0;
        else if (lowRegex.test(content)) level = 1;
        else if (medRegex.test(content)) level = 2;
        else if (highRegex.test(content)) level = 3;
        else if (maxRegex.test(content)) level = 4;
        if (level <= 0) return;

        if (!canTrigger({ type: 'OnSelf', slot, action: item, item })) return;
        const percent = level * 20;
        const strength = percentToFireStrength(percent);
        fireVenWolf(strength, settings.defaultDurationMs, `custom ${slot} ${item}`).catch((error) => {
            notify(`request failed: ${error.message}`, 8000);
        });
    }

    function handleCustomTextItems(data) {
        if (data.Type !== 'Action') return;
        if (!sameMember(sDict(data, 'DestinationCharacter', 'MemberNumber'), playerMemberNumber())) return;
        const content = data.Content || '';
        handleCustomLevel('ItemNipples', 'LactationPump', content, /LactationPumpPower/i, /ToOff/i, /LowSuction/i, /MediumSuction/i, /HighSuction/i, /MaximumSuction/i);
        handleCustomLevel('ItemNipples', 'NippleSuctionCups', content, /NipSuc/i, /ToLoose/i, /ToLight/i, /ToMedium/i, /ToHeavy/i, /ToMaximum/i);
        handleCustomLevel('ItemNipples', 'PlateClamps', content, /ItemNipplesPlate/i, /ClampsLoose/i, /ClampsLight/i, /ClampsMedium/i, /ClampsHeavy/i, /ClampsTight/i);
        handleCustomLevel('ItemButt', 'ButtPump', content, /BPumps/i, /ToEmpty/i, /ToLight/i, /ToInflated/i, /ToBloated/i, /ToMaximum/i);
    }

    function commandHelp() {
        return [
            '/vw status',
            '/vw on | /vw off',
            '/vw url http://127.0.0.1:8920',
            '/vw client all | /vw client <clientId>',
            '/vw max <1-200>',
            '/vw duration <ms>',
            '/vw maxduration <ms>',
            '/vw cooldown <ms>',
            '/vw pulse <pulseId> | /vw pulse clear',
            '/vw override on|off',
            '/vw onother on|off',
            '/vw dry on|off',
            '/vw debug on|off',
            '/vw test [strength] [ms]',
        ].join('\n');
    }

    function isSelfCommand(data) {
        const sender = data.Sender || sDict(data, 'SourceCharacter', 'MemberNumber');
        const senderName = data.SenderName || data.CharacterName || '';
        return sameMember(sender, playerMemberNumber()) || (!!W.Player && senderName === W.Player.Name);
    }

    function handleCommand(data) {
        const msg = String(data.Content || '').trim();
        if (!msg.startsWith(`/${COMMAND}`) && !msg.startsWith('/venwolf')) return false;
        if (!isSelfCommand(data)) return true;

        const parts = msg.split(/\s+/);
        const sub = String(parts[1] || 'status').toLowerCase();

        if (sub === 'help') {
            notify(commandHelp(), 20000);
            return true;
        }

        if (sub === 'status') {
            notify(`enabled=${settings.enabled}, url=${settings.baseUrl}, client=${settings.clientId}, max=${settings.maxFireStrength}, dry=${settings.dryRun}, seen=${runtime.eventSeen}, sent=${runtime.eventTriggered}, ok=${runtime.requestOk}, failed=${runtime.requestFailed}, last=${runtime.lastEvent || 'none'}`, 12000);
            return true;
        }

        if (sub === 'on' || sub === 'off') {
            settings.enabled = sub === 'on';
            saveSettings();
            notify(`adapter ${settings.enabled ? 'enabled' : 'disabled'}`);
            return true;
        }

        if (sub === 'url' && parts[2]) {
            const nextUrl = normalizeUrl(parts[2]);
            if (!nextUrl) notify('invalid URL');
            else {
                settings.baseUrl = nextUrl;
                saveSettings();
                notify(`VenWolf URL set to ${settings.baseUrl}`);
            }
            return true;
        }

        if (sub === 'client' && parts[2]) {
            settings.clientId = parts[2];
            saveSettings();
            notify(`clientId set to ${settings.clientId}`);
            return true;
        }

        if (sub === 'max' && parts[2]) {
            settings.maxFireStrength = clampNumber(parts[2], 1, 200);
            saveSettings();
            notify(`maxFireStrength set to ${settings.maxFireStrength}`);
            return true;
        }

        if (sub === 'duration' && parts[2]) {
            settings.defaultDurationMs = clampNumber(parts[2], 1, settings.maxDurationMs);
            saveSettings();
            notify(`defaultDurationMs set to ${settings.defaultDurationMs}`);
            return true;
        }

        if (sub === 'maxduration' && parts[2]) {
            settings.maxDurationMs = clampNumber(parts[2], 1, 300000);
            settings.defaultDurationMs = clampNumber(settings.defaultDurationMs, 1, settings.maxDurationMs);
            saveSettings();
            notify(`maxDurationMs set to ${settings.maxDurationMs}`);
            return true;
        }

        if (sub === 'cooldown' && parts[2]) {
            settings.cooldownMs = clampNumber(parts[2], 0, 60000);
            saveSettings();
            notify(`cooldownMs set to ${settings.cooldownMs}`);
            return true;
        }

        if (sub === 'pulse' && parts[2]) {
            settings.pulseId = parts[2].toLowerCase() === 'clear' ? '' : parts[2];
            saveSettings();
            notify(settings.pulseId ? `pulseId set to ${settings.pulseId}` : 'pulseId cleared');
            return true;
        }

        if ((sub === 'override' || sub === 'dry' || sub === 'onother' || sub === 'debug') && parts[2]) {
            const enabled = parts[2].toLowerCase() === 'on';
            if (sub === 'override') settings.override = enabled;
            if (sub === 'dry') settings.dryRun = enabled;
            if (sub === 'onother') settings.triggerOnOther = enabled;
            if (sub === 'debug') settings.debugEvents = enabled;
            saveSettings();
            notify(`${sub}=${enabled}`);
            return true;
        }

        if (sub === 'test') {
            const strength = clampNumber(parts[2] || 20, 0, 200);
            const duration = clampNumber(parts[3] || 3000, 1, settings.maxDurationMs);
            fireVenWolf(strength, duration, 'manual test')
                .then(() => notify(`test sent: strength=${strength}, duration=${duration}`))
                .catch((error) => notify(`test failed: ${error.message}`, 8000));
            return true;
        }

        notify(`unknown command. Use /${COMMAND} help`, 8000);
        return true;
    }

    function isCommandText(text) {
        const msg = String(text || '').trim();
        return msg.startsWith(`/${COMMAND}`) || msg.startsWith('/venwolf');
    }

    function handleCommandText(text) {
        if (!isCommandText(text)) return false;
        return handleCommand({ Content: text, Sender: playerMemberNumber(), SenderName: W.Player && W.Player.Name });
    }

    function getChatInput() {
        return document.getElementById('InputChat')
            || document.querySelector("textarea[name='InputChat']")
            || document.querySelector('textarea')
            || document.querySelector("input[type='text']");
    }

    function extractLocalCommand(argsLike) {
        const args = Array.prototype.slice.call(argsLike);
        for (const arg of args) {
            if (typeof arg === 'string' && (arg.startsWith(`/${COMMAND}`) || arg.startsWith('/venwolf'))) return arg;
            if (Array.isArray(arg) && arg.length > 0 && (arg[0] === COMMAND || arg[0] === 'venwolf')) return `/${arg.join(' ')}`;
        }
        return `/${COMMAND}`;
    }

    function registerCommand() {
        if (!Array.isArray(W.Commands)) return;
        if (W.Commands.some((item) => item.Tag === COMMAND)) return;
        W.Commands.push({
            Tag: COMMAND,
            Description: 'VenWolf adapter. Use /vw help.',
            Action: function () {
                const raw = extractLocalCommand(arguments);
                handleCommandText(raw);
            },
        });
    }

    function patchBC() {
        if (patched || !bcModApi) return patched;
        if (typeof W.CommandParse !== 'function' && typeof W.ChatRoomSendChat !== 'function' && typeof W.ChatRoomMessage !== 'function') return false;
        patched = true;

        if (typeof W.CommandParse === 'function') {
            bcModApi.hookFunction('CommandParse', 10000, (args, next) => {
                const text = String(args && args[0] || '');
                if (handleCommandText(text)) return true;
                return next(args);
            });
        }

        if (typeof W.ChatRoomSendChat === 'function') {
            bcModApi.hookFunction('ChatRoomSendChat', 10000, (args, next) => {
                const input = getChatInput();
                const text = input && input.value || '';
                if (handleCommandText(text)) {
                    if (input) input.value = '';
                    return undefined;
                }
                return next(args);
            });
        }

        if (typeof W.ChatRoomMessage === 'function') {
            bcModApi.hookFunction('ChatRoomMessage', 0, (args, next) => {
                const result = next(args);
                onChatRoomMessage(args && args[0]);
                return result;
            });
            eventPatched = true;
        }

        hookGameFunction('VibratorModePublish', 3, (args, next) => {
            const result = next(args);
            if (args && args[1] && sameMember(args[1].MemberNumber, playerMemberNumber())) {
                const slot = args[2] && args[2].Asset && args[2].Asset.DynamicGroupName;
                const item = slot ? appearanceBySlot(slot) : null;
                if (item) handleToyAssetState(item, 'Vibration', { hook: 'VibratorModePublish' });
            }
            return result;
        });

        hookGameFunction('ExtendedItemSetOption', 7, (args, next) => {
            const result = next(args);
            if (args && args.length >= 3 && args[1] && sameMember(args[1].MemberNumber, playerMemberNumber())) {
                handleToyAssetState(args[2], 'ToyEvent', { hook: 'ExtendedItemSetOption' });
            }
            return result;
        });

        hookGameFunction('InventoryWear', 8, (args, next) => {
            const result = next(args);
            if (args && args[0] && sameMember(args[0].MemberNumber, playerMemberNumber())) {
                const asset = appearanceByAssetName(args[1]);
                if (asset) {
                    dispatchGameEvent({
                        type: 'OnSelf',
                        slot: assetGroupName(asset),
                        action: 'ItemAdded',
                        item: asset.Asset && asset.Asset.Name,
                        intensity: 12,
                        durationMs: 6000,
                        raw: { hook: 'InventoryWear' },
                    });
                    handleToyAssetState(asset, 'ToyEvent', { hook: 'InventoryWear' });
                }
            }
            return result;
        });

        hookGameFunction('InventoryRemove', 3, (args, next) => {
            if (args && args[0] && sameMember(args[0].MemberNumber, playerMemberNumber())) {
                const asset = appearanceBySlot(args[1]);
                if (asset) {
                    dispatchGameEvent({
                        type: 'OnSelf',
                        slot: assetGroupName(asset),
                        action: 'ItemRemoved',
                        item: asset.Asset && asset.Asset.Name,
                        intensity: 8,
                        durationMs: 3000,
                        raw: { hook: 'InventoryRemove' },
                    });
                }
            }
            return next(args);
        });

        hookGameFunction('PropertyShockPublishAction', 3, (args, next) => {
            const focusItem = args && args[1] && args[1].Property
                ? args[1]
                : (W.DialogFocusItem && W.DialogFocusItem.Property ? W.DialogFocusItem : null);
            if (focusItem) handleToyAssetState(focusItem, 'Shock', { hook: 'PropertyShockPublishAction' });
            return next(args);
        });

        return true;
    }

    function hookGameFunction(name, priority, handler) {
        if (!bcModApi || typeof W[name] !== 'function') return false;
        try {
            bcModApi.hookFunction(name, priority, handler);
            return true;
        } catch (error) {
            console.warn(`[${SHORT}] hook failed: ${name}`, error);
            return false;
        }
    }

    function registerSocketListener() {
        if (socketListenerRegistered || !W.ServerSocket || typeof W.ServerSocket.on !== 'function') return false;
        socketListenerRegistered = true;
        W.ServerSocket.on('ChatRoomMessage', onChatRoomMessage);
        return true;
    }

    function onChatRoomMessage(data) {
        if (!data || !data.Type) return;
        if (handleCommand(data)) return;
        if ((data.Content && IGNORE_CONTENT.has(data.Content)) || IGNORE_TYPE.has(data.Type)) return;

        handlePortalLink(data);
        handleActivity(data);
        handleShockAction(data);
        handleItemEquip(data);
        handleToyEvents(data);
        handleCustomTextItems(data);
    }

    function waitForBC() {
        return new Promise((resolve) => {
            const start = Date.now();
            let warned = false;
            const timer = setInterval(() => {
                if (W.Player && (
                    typeof W.CommandParse === 'function'
                    || typeof W.ChatRoomSendChat === 'function'
                    || typeof W.ChatRoomMessage === 'function'
                    || (W.ServerSocket && typeof W.ServerSocket.on === 'function')
                    || Array.isArray(W.Commands)
                )) {
                    clearInterval(timer);
                    resolve();
                    return;
                }
                if (!warned && Date.now() - start > 60000) {
                    warned = true;
                    console.warn(`[${SHORT}] BC runtime was not ready after 60s.`);
                }
            }, 500);
        });
    }

    async function main() {
        await waitForBC();
        await registerModSdk();
        patchBC();
        registerCommand();
        if (!eventPatched) registerSocketListener();
        notify(`adapter ready v${VERSION}; client=${settings.clientId}; url=${settings.baseUrl}`, 8000);
    }

    main().catch((error) => {
        console.error(`[${SHORT}] init failed`, error);
    });
})();
