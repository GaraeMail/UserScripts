// ==UserScript==
// @name         Site customs / chzzk.naver.com
// @namespace    private-sites-custom
// @version      2024-01-30
// @description  Customs for chzzk.naver.com
// @author       GaraeMail
// @match        *://chzzk.naver.com/*
// @include      /naver\.com\/shorts.*$/
// @icon         <$ICON$>
// @grant        GM_addStyle
// @run-at       document-start

// ==/UserScript==
/* eslint-disable no-undef */

GM_addStyle(`
    html:not(.theme_dark) {
        --color-bg-01: #f5f5f5 !important;
    }

    /* VOD 목록에 시청 길이 바로 표시 */
    .vod_played_bar {
        background-color: #f00;
        height: 4px;
        display: block;
        position: absolute;
        bottom: 0px;
    }

    /* 플레이어 볼륨조절에 수치 표시 */
    .chzzk_volume_text {
        visibility: hidden;
        display: none;
    }
    .chzzk_volume_text_added:hover .chzzk_volume_text {
        visibility: visible;
        display: block;
    }

    /* 서비스 바로가기 */
    div[class^="header_service"]:has(a[target="_blank"]),
    div[class^="navigator_wrapper"]:first-of-type:before,
    div[class^="navigator_wrapper__"]:has(a[href^="/partner"])
    {
        display: none;
    }

    div.chzzk_el_moved_service:before {
        background-color: hsla(0, 0%, 100%, .06);
        content: "";
        height: 1px;
        left: 21px;
        position: absolute;
        right: 21px;
    }

    /* 메인화면 이벤트 모달팝업 */
    div[class^=loungehome_event_popup_container],
    /* 파트너 소개 */
    section[class^="component_container"]:has(div[class^="partner_list"]),
    /* 도네 채팅 */
    div[class*="live_chatting_list_donation"],
    /* 도네 랭킹 */
    div[class^="live_chatting_ranking_container"],
    /* 구독 */
    div[class*="live_chatting_list_subscription"],
    /* 좌측 메뉴*/
    [class^="header_service"],
    /* 차단된 유저의 라이브 */
    li[class^="component_item"]:has(div[class*="video_card_is_block"]),
    /* 안보이게 추가 css */
    .chzzk_el_display_none
    {
        display: none !important;
    }
`);

const cloneNode = (node) => {
    let genericNode = document.createElement(node.tagName);
    let clone = node.cloneNode();
    for(let propertyName in node) {
        if( !( propertyName in genericNode ) ) {
            clone[ propertyName ] = node[ propertyName ];
        }
    }

    let children = node.childNodes;
    children.forEach(child => {
        let childClone = cloneNode(child);
        clone.appendChild(childClone);
    });
    return clone;
}

const getVodHistory = () => JSON.parse(window.localStorage.getItem('vidHistory')) || {};

const setVodHistory = (obj) => window.localStorage.setItem('vidHistory', obj);

const addWatchingPercentBarVod = () => {
    let vodHist = getVodHistory();

    document.querySelectorAll('a[class^="video_card_thumbnail"]:not(.vod_played_bar_done)')
        .forEach(vod => {
            vod.classList.add('vod_played_bar_done');

            let vodId = vod.href.split('/').pop();
            if (!vodHist[vodId]) return;

            let {ts, du} = vodHist[vodId];
            du = du || ts;

            let bar = vod.querySelector('.vod_played_bar');
            if (!bar) {
                bar = document.createElement("span");
                bar.setAttribute('class', 'vod_played_bar');
                vod.appendChild(bar);
            }
            bar.setAttribute('style', `width: ${(ts / du * 100).toFixed(0)}%`);
        });
}

const setQualityToBestVod = () => {
    if (location.href.split('/')[3] === 'video') {
        let qualities = document.querySelectorAll('.pzp-pc-ui-setting-quality-item.pzp-pc-ui-setting-item');
        qualities[1]
            && !(qualities[1].classList.contains('pzp-pc-ui-setting-item--checked'))
            && qualities[1].click();
    }
}

const restoreWatchingPositionVod = () => {
    let [, , , rootPath, vodId] = location.href.split('/');
    if (rootPath === 'video') {
        let vodHist = getVodHistory();
        let player = document.querySelector('video:not(.chzzk_vid_played)');
        if (player) {
            let timeBefore = vodHist[vodId] || {};

            player.currentTime = (timeBefore.ts || 1) - 1;

            player.addEventListener('timeupdate', function (e) {
                if (this.currentTime > 1 && e.timeStamp > 5000) {
                    let vodHist = getVodHistory();
                    vodHist[vodId] = {
                        ts: this.currentTime,
                        lu: Date.now(),
                        du: this.duration,
                    }
                    let newHist = {};
                    Object.keys(vodHist).forEach((vidId) => {
                        if (vodHist[vidId].lu > Date.now() - (1000 * 60 * 60 * 24 * 7)) {
                            newHist[vidId] = vodHist[vidId];
                        }
                    });
                    setVodHistory(JSON.stringify(newHist));
                }
            });
            player.classList.add('chzzk_vid_played');
        }
    }
}

const addVolumeText = () => {
    let volCont = document.querySelector('.pzp-pc__volume-control:not(.chzzk_volume_text_added)');
    let slider = volCont?.querySelector('.pzp-pc-volume-slider');
    if (!volCont || !slider) return;

    volCont.classList.add('chzzk_volume_text_added');

    let textCont = document.createElement("span");
    textCont.setAttribute('class', 'pzp-ui-text chzzk_volume_text');
    textCont.setAttribute('style', 'margin-left: 8px;');
    let volText = document.createTextNode(`${slider.ariaValueNow}%`);
    textCont.appendChild(volText);
    volCont.appendChild(textCont);

    let observer = new MutationObserver(mutationRecords => {
        let vol = mutationRecords.filter(r => r.attributeName === 'aria-valuenow').pop();
        vol && (volText.data = `${vol.target.ariaValueNow}%`);
    });
    observer.observe(slider, { attributes: true });
}

const moveMenuItemsToTop = () => {
    let logoCheck = document.querySelector('h1[class^="header_logo"].chzzk_el_moved_service');
    // logoCheck.forEach((node, i, arr) => {
    //     if (arr.length > 1 & i < arr.length - 1) {
    //         node.remove();
    //     }
    // });

    let headerMenu = document.querySelector('[class^="header_service"]:has(a[href*="/lives"]):not(.chzzk_el_moved_service)');
    // let headerMenu = document.querySelector('[class^="header_service"]:has(a[href*="/lives"])');
    if (!headerMenu) return;
    headerMenu.classList.add('chzzk_el_moved_service');

    let headerLogo = document.querySelector('h1[class^="header_logo"]');
    let headerLogoClone = headerLogo.cloneNode();
    headerLogoClone.classList.add(...headerMenu.classList,'chzzk_el_moved_service');
    headerLogoClone.setAttribute('style', 'top: 0px; left: 150px;');
    headerLogo.appendChild(headerLogoClone);

    while (headerMenu.childNodes.length) {
        let elA = headerMenu.childNodes[0];
        elA.setAttribute('style', 'margin-top: 6px; margin-right: 6px;');
        elA.childNodes.forEach(node => {
            if (node.tagName.toLowerCase() !== 'svg') {
                node.classList.add('chzzk_el_display_none');
            }
        });
        headerLogoClone.appendChild(elA);
    }
}

const hideCastByCategory = () => {
    const cate = [
        'Lost_Ark',
        'Valorant',
        'Dungeon_Fighter',
        'Teamfight_Tactics',
        'MapleStory',
        'Hearthstone',
        'Genshin_Impact',
        'League_of_Legends'
    ];

    cate.forEach(ct => {
        let casts = document.querySelectorAll(`[class^="component_item"]:has(a[href*="${ct}"]`);
        Array.from(casts).forEach(el => el.remove());
    });
};

const smallerClipVolume = () => {
    const vid = document.querySelector('video[src*="glive-clip"]:not(.normalized)');
    if (vid) {
        vid.volume = 0.15;
        vid.classList.add('normalized');
    }
}

(function() {
    'use strict';

    setInterval(() => {
        moveMenuItemsToTop();
        //addWatchingPercentBarVod();
        //setQualityToBestVod();
        //restoreWatchingPositionVod();
        addVolumeText();
        smallerClipVolume();
        //hideCastByCategory();
    }, 100);
})();
