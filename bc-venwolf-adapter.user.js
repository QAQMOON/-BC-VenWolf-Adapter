// ==UserScript==
// @name         BC VenWolf Adapter
// @namespace    VenWolf-BondageClub
// @version      0.1.0
// @description  Send Bondage Club activity events to VenWolf/DG-Lab Game API.
// @author       QAQMOON
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @include      /^http:\/\/localhost(?::\d+)?\/.*$/
// @include      /^http:\/\/127\.0\.0\.1(?::\d+)?\/.*$/
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '0.1.0';
    const SHORT = 'BC-VenWolf';
    const STORE_KEY = 'BC_VenWolf_Adapter_v1';
    const COMMAND = 'vw';
    const REQUEST_TIMEOUT_MS = 5000;

    if (window.__BC_VENWOLF_ADAPTER__) {
        console.warn(`[${SHORT}] already loaded.`);
        return;
    }
    window.__BC_VENWOLF_ADAPTER__ = { version: VERSION };

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
    const runtime = {
        lastFireAt: 0,
        lastEventKey: '',
        requestOk: 0,
        requestFailed: 0,
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
        if (!settings.showLocalMessages || typeof window.ChatRoomSendLocal !== 'function') return;
        window.ChatRoomSendLocal(`[VenWolf] ${message}`, durationMs || 8000);
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
        if (!settings.enabled) return;
        if (event.type === 'OnOther' && !settings.triggerOnOther) return;

        const matchedRule = findRule(event);
        if (!matchedRule && !settings.useZoneFallback) return;
        if (!canTrigger(event)) return;

        const percent = matchedRule
            ? matchedRule.intensity
            : calcZoneIntensityPercent(event.slot, event.action);
        const duration = matchedRule
            ? matchedRule.durationMs
            : settings.defaultDurationMs;
        const strength = percentToFireStrength(percent);
        const reason = `${event.type} ${event.slot || '*'} ${event.action || '*'} ${event.item || ''}`.trim();

        fireVenWolf(strength, duration, reason).catch((error) => {
            notify(`request failed: ${error.message}`, 8000);
        });
    }

    function sameMember(left, right) {
        return String(left || '') === String(right || '');
    }

    function playerMemberNumber() {
        return window.Player && window.Player.MemberNumber;
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
        const appearance = window.Player && window.Player.Appearance;
        if (!Array.isArray(appearance)) return null;
        return appearance.find((item) => item && item.Asset && item.Asset.Name === assetName) || null;
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
        handleCustomLevel('ItemNipples', 'PlateClamps', content, /ItemNipplesPlate/i, /ClampsLoose/i, /ClampsLoose/i, /ClampsLoose/i, /ClampsLoose/i, /ClampsTight/i);
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
            '/vw test [strength] [ms]',
        ].join('\n');
    }

    function isSelfCommand(data) {
        const sender = data.Sender || sDict(data, 'SourceCharacter', 'MemberNumber');
        const senderName = data.SenderName || data.CharacterName || '';
        return sameMember(sender, playerMemberNumber()) || (!!window.Player && senderName === window.Player.Name);
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
            notify(`enabled=${settings.enabled}, url=${settings.baseUrl}, client=${settings.clientId}, max=${settings.maxFireStrength}, dry=${settings.dryRun}, ok=${runtime.requestOk}, failed=${runtime.requestFailed}`, 12000);
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

        if ((sub === 'override' || sub === 'dry' || sub === 'onother') && parts[2]) {
            const enabled = parts[2].toLowerCase() === 'on';
            if (sub === 'override') settings.override = enabled;
            if (sub === 'dry') settings.dryRun = enabled;
            if (sub === 'onother') settings.triggerOnOther = enabled;
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

    function extractLocalCommand(argsLike) {
        const args = Array.prototype.slice.call(argsLike);
        for (const arg of args) {
            if (typeof arg === 'string' && (arg.startsWith(`/${COMMAND}`) || arg.startsWith('/venwolf'))) return arg;
            if (Array.isArray(arg) && arg.length > 0 && (arg[0] === COMMAND || arg[0] === 'venwolf')) return `/${arg.join(' ')}`;
        }
        return `/${COMMAND}`;
    }

    function registerCommand() {
        if (!Array.isArray(window.Commands)) return;
        if (window.Commands.some((item) => item.Tag === COMMAND)) return;
        window.Commands.push({
            Tag: COMMAND,
            Description: 'VenWolf adapter. Use /vw help.',
            Action: function () {
                const raw = extractLocalCommand(arguments);
                handleCommand({ Content: raw, Sender: playerMemberNumber(), SenderName: window.Player && window.Player.Name });
            },
        });
    }

    function onChatRoomMessage(data) {
        if (!data || !data.Type) return;
        if (handleCommand(data)) return;
        if ((data.Content && IGNORE_CONTENT.has(data.Content)) || IGNORE_TYPE.has(data.Type)) return;

        handlePortalLink(data);
        handleActivity(data);
        handleShockAction(data);
        handleCustomTextItems(data);
    }

    function waitForBC() {
        return new Promise((resolve) => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (window.ServerSocket && typeof window.ServerSocket.on === 'function' && window.Player && Array.isArray(window.Commands)) {
                    clearInterval(timer);
                    resolve();
                    return;
                }
                if (Date.now() - start > 60000) {
                    clearInterval(timer);
                    console.warn(`[${SHORT}] BC runtime was not ready after 60s.`);
                }
            }, 500);
        });
    }

    async function main() {
        await waitForBC();
        registerCommand();
        window.ServerSocket.on('ChatRoomMessage', onChatRoomMessage);
        notify(`adapter ready v${VERSION}; client=${settings.clientId}; url=${settings.baseUrl}`, 8000);
    }

    main().catch((error) => {
        console.error(`[${SHORT}] init failed`, error);
    });
})();
