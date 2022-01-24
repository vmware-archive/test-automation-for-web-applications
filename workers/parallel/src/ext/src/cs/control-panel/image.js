

const vtaasImages = {
    start: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>play-solid</title>',
            '<path class="clr-i-solid clr-i-solid-path-1" d="M32.16,16.08,8.94,4.47A2.07,2.07,0,0,0,6,6.32V29.53a2.06,2.06,0,0,0,3,1.85L32.16,19.77a2.07,2.07,0,0,0,0-3.7Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    pause: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>pause-solid</title>',
            '<rect class="clr-i-solid clr-i-solid-path-1" x="3.95" y="4" width="11" height="28" rx="2.07" ry="2.07"></rect><rect class="clr-i-solid clr-i-solid-path-2" x="20.95" y="4" width="11" height="28" rx="2.07" ry="2.07"></rect>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    resume: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>resume</title>',
            '<path class="clr-i-solid clr-i-solid-path-1" d="m33,17.66668l-18.45454,14.99999l0,-29.99998l18.45454,14.99999zm-28.99999,14.99999l6.59091,0l0,-29.99998l-6.59091,0l0,29.99998z"/>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    stop: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>stop-solid</title>',
            '<rect class="clr-i-solid clr-i-solid-path-1" x="3.96" y="4" width="27.99" height="28" rx="2" ry="2"></rect>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    assert: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>tasks-solid</title>',
            '<path class="clr-i-solid clr-i-solid-path-1" d="M29.29,4.95h-7.2a4.31,4.31,0,0,0-8.17,0H7A1.75,1.75,0,0,0,5,6.64V32.26a1.7,1.7,0,0,0,1.71,1.69H29.29A1.7,1.7,0,0,0,31,32.26V6.64A1.7,1.7,0,0,0,29.29,4.95Zm-18,3a1,1,0,0,1,1-1h3.44V6.32a2.31,2.31,0,0,1,4.63,0V7h3.44a1,1,0,0,1,1,1V9.8H11.25Zm14.52,9.23-9.12,9.12-5.24-5.24a1.4,1.4,0,0,1,2-2l3.26,3.26,7.14-7.14a1.4,1.4,0,1,1,2,2Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    execute: `
        <svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Execute command</title>
            <path d="M32,5H4A2,2,0,0,0,2,7V29a2,2,0,0,0,2,2H32a2,2,0,0,0,2-2V7A2,2,0,0,0,32,5ZM6.8,15.81V13.17l10,4.59v2.08l-10,4.59V21.78l6.51-3ZM23.4,25.4H17V23h6.4ZM4,9.2V7H32V9.2Z" class="clr-i-solid clr-i-solid-path-1"></path>
            <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
        </svg>
    `,

    mouseOver: `
        <svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Turn on/off mouseover event</title>
            <path class="clr-i-solid clr-i-solid-path-1" d="M29,12.36,3.88,3A1,1,0,0,0,2.59,4.28L12,29.44a1,1,0,0,0,1.89-.05l2.69-8.75,9.12,8.9a1,1,0,0,0,1.41,0l2.35-2.35a1,1,0,0,0,0-1.41l-9.09-8.86L29,14.25A1,1,0,0,0,29,12.36Z"></path>
            <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
        </svg>
    `,

    fileBug: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>bug-solid</title>',
            '<path class="clr-i-solid clr-i-solid-path-1" d="M30.83,20H29a19.29,19.29,0,0,0-1.18-5.73l1.46-.79a1,1,0,0,0-.95-1.76l-3,1.28H10.78L7.7,11.72a1,1,0,0,0-.95,1.76l1.5.8A19.38,19.38,0,0,0,7.07,20H5.17a1,1,0,0,0,0,2H7.1a14.62,14.62,0,0,0,1.66,6.17L6.87,29.49A1,1,0,1,0,8,31.12l1.84-1.29A10.29,10.29,0,0,0,17,33.6V15h2V33.6a10.29,10.29,0,0,0,7.16-3.75L28,31.12a1,1,0,1,0,1.15-1.64l-1.86-1.3A14.61,14.61,0,0,0,28.94,22h1.89a1,1,0,0,0,0-2ZM10.91,17.74a1.95,1.95,0,1,1,1.95,1.95A1.95,1.95,0,0,1,10.91,17.74ZM14,27.46a1.58,1.58,0,1,1,1.58-1.58A1.58,1.58,0,0,1,14,27.46Zm8.43,0A1.58,1.58,0,1,1,24,25.88,1.58,1.58,0,0,1,22.42,27.46Zm1.13-7.77a1.95,1.95,0,1,1,1.95-1.95A1.95,1.95,0,0,1,23.56,19.69Z"></path><path class="clr-i-solid clr-i-solid-path-2" d="M11.23,5.26a1.67,1.67,0,0,0,.54-.32,5.9,5.9,0,0,1,.89.58,7.44,7.44,0,0,1,.95.94A18.48,18.48,0,0,0,10.79,9.7c-.4.57.09,1.28.86,1.28H24.44c.77,0,1.26-.71.86-1.28a18.38,18.38,0,0,0-2.88-3.28,7.28,7.28,0,0,1,.91-.9,5.9,5.9,0,0,1,.89-.58,1.69,1.69,0,1,0-.56-1.51,7.49,7.49,0,0,0-1.32.83,9.06,9.06,0,0,0-1.19,1.18A5.85,5.85,0,0,0,18,4.3a5.91,5.91,0,0,0-3.17,1.19,9.2,9.2,0,0,0-1.22-1.21,7.49,7.49,0,0,0-1.32-.83,1.68,1.68,0,1,0-1.11,1.83Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    copy: `
        <svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Copy Non-ascii string to clipboard</title>
            <path d="M27,3.56A1.56,1.56,0,0,0,25.43,2H5.57A1.56,1.56,0,0,0,4,3.56V28.44A1.56,1.56,0,0,0,5.57,30h.52V4.07H27Z" class="clr-i-solid clr-i-solid-path-1"></path><rect x="8" y="6" width="23" height="28" rx="1.5" ry="1.5" class="clr-i-solid clr-i-solid-path-2"></rect>
            <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
        </svg>
    `,

    captureScreen: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>camera-solid</title>',
            '<path d="M32,8H24.7L23.64,5.28A2,2,0,0,0,21.78,4H14.22a2,2,0,0,0-1.87,1.28L11.3,8H4a2,2,0,0,0-2,2V30a2,2,0,0,0,2,2H32a2,2,0,0,0,2-2V10A2,2,0,0,0,32,8ZM6.17,13.63a.8.8,0,0,1,0-1.6h2.4a.8.8,0,0,1,0,1.6ZM18,28a9,9,0,1,1,9-9A9,9,0,0,1,18,28Z" class="clr-i-solid clr-i-solid-path-1"></path><path d="M11.11,19.06a7.07,7.07,0,0,0,4.11,6.41l1.09-1.74a5,5,0,1,1,5.22-8.39l1.09-1.76a7.06,7.06,0,0,0-11.51,5.48Z" class="clr-i-solid clr-i-solid-path-2"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    accessibility: `
        <svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Check accessibility</title>
            <path d="M14.77,31.94a7.31,7.31,0,0,1-5.7-11.88L7.65,18.64a9.3,9.3,0,0,0,13.1,13.11l-1.42-1.42A7.29,7.29,0,0,1,14.77,31.94Z" class="clr-i-solid clr-i-solid-path-1"></path><path d="M26.65,2.1a3.12,3.12,0,1,0,3.11,3.12A3.12,3.12,0,0,0,26.65,2.1Z" class="clr-i-solid clr-i-solid-path-2"></path><path d="M26.81,18.18H21.47q-.31-.33-.66-.63l4.38-4.86a2.14,2.14,0,0,0-.53-3.27L20.9,7.23l0,0L17.05,5.07a1,1,0,0,0-1.11.08L11.15,8.9a1,1,0,0,0,1.23,1.58l4.27-3.34,2.87,1.63L13.6,15.39a9.33,9.33,0,0,0-4.44,1.82l1.42,1.43A7.3,7.3,0,0,1,20.75,28.81l1.43,1.43A9.27,9.27,0,0,0,23,20.18h2.74l-.77,6.51a1,1,0,0,0,.87,1.11h.12a1,1,0,0,0,1-.88l.9-7.62a1,1,0,0,0-.25-.78A1,1,0,0,0,26.81,18.18Z" class="clr-i-solid clr-i-solid-path-3"></path>
            <rect x="0" y="0" width="36" height="36" fill-opacity="0"/>
        </svg>
    `,

    settings: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>cog-solid</title>',
            '<path class="clr-i-solid clr-i-solid-path-1" d="M32.57,15.72l-3.35-1a11.65,11.65,0,0,0-.95-2.33l1.64-3.07a.61.61,0,0,0-.11-.72L27.41,6.2a.61.61,0,0,0-.72-.11L23.64,7.72a11.62,11.62,0,0,0-2.36-1l-1-3.31A.61.61,0,0,0,19.69,3H16.31a.61.61,0,0,0-.58.43l-1,3.3a11.63,11.63,0,0,0-2.38,1l-3-1.62a.61.61,0,0,0-.72.11L6.2,8.59a.61.61,0,0,0-.11.72l1.62,3a11.63,11.63,0,0,0-1,2.37l-3.31,1a.61.61,0,0,0-.43.58v3.38a.61.61,0,0,0,.43.58l3.33,1a11.62,11.62,0,0,0,1,2.33L6.09,26.69a.61.61,0,0,0,.11.72L8.59,29.8a.61.61,0,0,0,.72.11l3.09-1.65a11.65,11.65,0,0,0,2.3.94l1,3.37a.61.61,0,0,0,.58.43h3.38a.61.61,0,0,0,.58-.43l1-3.38a11.63,11.63,0,0,0,2.28-.94l3.11,1.66a.61.61,0,0,0,.72-.11l2.39-2.39a.61.61,0,0,0,.11-.72l-1.66-3.1a11.63,11.63,0,0,0,.95-2.29l3.37-1a.61.61,0,0,0,.43-.58V16.31A.61.61,0,0,0,32.57,15.72ZM18,23.5A5.5,5.5,0,1,1,23.5,18,5.5,5.5,0,0,1,18,23.5Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    ok: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>check-line</title>',
            '<path class="clr-i-outline clr-i-outline-path-1" d="M13.72,27.69,3.29,17.27a1,1,0,0,1,1.41-1.41l9,9L31.29,7.29a1,1,0,0,1,1.41,1.41Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),

    cancel: [
        '<svg version="1.1" width="36" height="36"  viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
            '<title>times-line</title>',
            '<path class="clr-i-outline clr-i-outline-path-1" d="M19.41,18l8.29-8.29a1,1,0,0,0-1.41-1.41L18,16.59,9.71,8.29A1,1,0,0,0,8.29,9.71L16.59,18,8.29,26.29a1,1,0,1,0,1.41,1.41L18,19.41l8.29,8.29a1,1,0,0,0,1.41-1.41Z"></path>',
            '<rect x="0" y="0" width="36" height="36" fill-opacity="0"/>',
        '</svg>'
    ].join(''),
}