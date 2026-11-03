export const CAMERA_TYPES = {
    automatic: 'automatic',
    manual: 'manual',
};

export const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    SUCCESS: 'success',
};

const guide = (id, message, severity, extra = {}) => ({
    id,
    message,
    severity,
    
    priority: extra.priority ?? 0,
    
    
    vibrate: extra.vibrate ?? null,
});

export const CAMERA_GUIDANCE = {
    
    WAITING: guide('waiting', 'در حال آماده‌سازی…', SEVERITY.INFO),
    NO_TEXT: guide('no_text', 'متنی دیده نمی‌شود. دوربین را روی صفحه بگیرید.', SEVERITY.WARNING, {
        vibrate: [20],
    }),

    MOVE_LEFT: guide('move_left', 'دوربین را کمی به چپ ببرید', SEVERITY.WARNING, { vibrate: [60] }),
    MOVE_RIGHT: guide('move_right', 'دوربین را کمی به راست ببرید', SEVERITY.WARNING, { vibrate: [60, 80, 60] }),
    MOVE_UP: guide('move_up', 'دوربین را کمی بالا ببرید', SEVERITY.WARNING, { vibrate: [30, 60, 30] }),
    MOVE_DOWN: guide('move_down', 'دوربین را کمی پایین ببرید', SEVERITY.WARNING, { vibrate: [120] }),

    MOVE_FARTHER: guide('move_back', 'کمی عقب‌تر بروید', SEVERITY.WARNING, { vibrate: [40, 40, 40, 40] }),
    MOVE_CLOSER: guide('move_closer', 'کمی جلوتر بروید', SEVERITY.WARNING, { vibrate: [200] }),

    ROTATE: guide('rotate', 'گوشی را بچرخانید تا خطوط متن افقی شوند', SEVERITY.WARNING),
    TOO_DARK: guide('too_dark', 'نور کم است. جای روشن‌تری بروید.', SEVERITY.WARNING),
    GLARE: guide('glare', 'بازتاب نور روی صفحه است. زاویه را کمی تغییر دهید.', SEVERITY.WARNING),
    BLURRY: guide('blurry', 'تصویر لرزیده. دوربین را ثابت نگه دارید.', SEVERITY.WARNING),

    FLASH_ON: guide('flash_on', 'چراغ روشن شد', SEVERITY.INFO, { priority: 1 }),
    FLASH_OFF_GLARE: guide(
        'flash_off_glare',
        'چراغ بازتاب ایجاد می‌کرد، خاموش شد. کاغذ براق است.',
        SEVERITY.INFO,
        { priority: 1 },
    ),
    
    FLASH_MANUAL_ON: guide('flash_manual_on', 'چراغ روشن شد', SEVERITY.INFO, {
        priority: 2,
        vibrate: [40],
    }),
    FLASH_MANUAL_OFF: guide('flash_manual_off', 'چراغ خاموش شد', SEVERITY.INFO, {
        priority: 2,
        vibrate: [40, 60, 40],
    }),

    
    HOLD_STILL: guide('hold_still', 'خوب است، ثابت نگه دارید', SEVERITY.INFO, { priority: 1 }),
    TARGET_FOUND: guide('target_found', 'کادر کامل است', SEVERITY.SUCCESS, { priority: 2, vibrate: [30, 50, 30, 50, 200] }),
    CAPTURING: guide('capturing', 'عکس گرفته شد', SEVERITY.SUCCESS, { priority: 3 }),

    MANUAL_READY: guide('manual_ready', 'برای گرفتن عکس، صفحه را لمس کنید', SEVERITY.INFO),
};


CAMERA_GUIDANCE.MOVE_BACK = CAMERA_GUIDANCE.MOVE_FARTHER;

export const ALL_GUIDANCE = Object.values(CAMERA_GUIDANCE);

export const OPPOSITE_GUIDANCE = {
    move_left: 'move_right',
    move_right: 'move_left',
    move_up: 'move_down',
    move_down: 'move_up',
    move_back: 'move_closer',
    move_closer: 'move_back',
};
