/**
 * Centralized lunisolar plugin initialization.
 * Import this module once at startup to ensure plugins are loaded exactly once.
 */
import lunisolar from "lunisolar";
import theGods from "lunisolar/plugins/theGods";
import takeSound from "lunisolar/plugins/takeSound";
import fetalGod from "lunisolar/plugins/fetalGod";
import theGodsZhCn from "@lunisolar/plugin-thegods/locale/zh-cn";

// Locale must be loaded before fetalGod
lunisolar.locale(theGodsZhCn);
lunisolar.extend(theGods);
lunisolar.extend(takeSound);
lunisolar.extend(fetalGod);

export { lunisolar };
