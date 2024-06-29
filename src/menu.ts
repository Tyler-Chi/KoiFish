import {
    PartialConfig,
    getConfig,
    getManualTheme,
    setActiveConfig,
    setManualTheme,
} from './util/configUtil';
import { applyOpacity, parseOpacity } from './util/colorUtil';

import { objectManager } from '.';

const getDrawSimplifiedKoiFishCheckbox = (): HTMLInputElement => {
    return document.getElementById('drawSimplifiedKoiFish') as HTMLInputElement;
};

const getDrawLeaderFollowerLinksCheckbox = (): HTMLInputElement => {
    return document.getElementById(
        'drawLeaderFollowerLinks',
    ) as HTMLInputElement;
};

const getWaterOpacitySlider = (): HTMLInputElement => {
    return document.getElementById('waterOpacitySlider') as HTMLInputElement;
};

const getWaterOpacityValue = (): HTMLSpanElement => {
    return document.getElementById('waterOpacityValue') as HTMLSpanElement;
};

const getIncludeLanternCheckbox = (): HTMLInputElement => {
    return document.getElementById('dynamicLanternShadows') as HTMLInputElement;
};

const getHideMenuOpenerCheckbox = (): HTMLInputElement => {
    return document.getElementById('hideMenuOpener') as HTMLInputElement;
};

// Update both the dropdown text and highlight the selected item
const updateThemeDropdown = (currentTheme: string): void => {
    const themeDropdownButton = document.getElementById(
        'themeDropdownButton',
    ) as HTMLElement;
    themeDropdownButton.innerText = currentTheme;

    document.querySelectorAll('.dropdown-item').forEach(function (item) {
        item.classList.remove('selected-dropdown-item');
    });

    // Add the highlight class to the specified item
    const itemToHighlight = document.getElementById(currentTheme);

    if (itemToHighlight) {
        itemToHighlight.classList.add('selected-dropdown-item');
    }
};

let menuConfig: PartialConfig = {};

// Populate the menu inputs, based on the config
// This should only be run once the activeConfig has been reset
export const populateMenuInputs = (): void => {
    // Show some draw vectors
    getDrawSimplifiedKoiFishCheckbox().checked =
        getConfig().fish.drawSimplified;
    getDrawLeaderFollowerLinksCheckbox().checked =
        getConfig().fish.drawLeaderFollowerLinks;

    // SurfaceColor opacity
    const waterOpacity = parseOpacity(getConfig().environment.surfaceColor);
    getWaterOpacitySlider().value = String(waterOpacity);
    getWaterOpacityValue().textContent = String(waterOpacity);

    getIncludeLanternCheckbox().checked = getConfig().lantern.include;

    const manualTheme = getManualTheme();
    updateThemeDropdown(manualTheme);
};

export function initMenu() {
    const toggleButton = document.getElementById(
        'toggleMenu',
    ) as HTMLImageElement;
    const menu = document.getElementById('menu') as HTMLElement;

    if (!toggleButton || !menu) {
        console.error('Toggle button or menu element not found in the DOM');
        return;
    }

    toggleButton.addEventListener('click', () => {
        const isMenuVisible = menu.classList.contains('show');
        if (isMenuVisible) {
            menu.classList.remove('show');
            menu.style.pointerEvents = 'none';
        } else {
            menu.classList.add('show');
            menu.style.pointerEvents = 'auto';
        }
    });

    const hideMenuOpenerCheckbox = document.getElementById(
        'hideMenuOpener',
    ) as HTMLInputElement;

    getDrawSimplifiedKoiFishCheckbox().addEventListener('change', () => {
        menuConfig.fish = {
            ...menuConfig.fish,
            drawSimplified: getDrawSimplifiedKoiFishCheckbox().checked,
        };
        setActiveConfig();
    });

    getDrawLeaderFollowerLinksCheckbox().addEventListener('change', () => {
        menuConfig.fish = {
            ...menuConfig.fish,
            drawLeaderFollowerLinks:
                getDrawLeaderFollowerLinksCheckbox().checked,
        };
        setActiveConfig();
    });

    getWaterOpacitySlider().addEventListener('input', () => {
        const newValue = getWaterOpacitySlider().value;
        getWaterOpacityValue().textContent = newValue;
        menuConfig.environment = {
            ...menuConfig.environment,
            surfaceColor: applyOpacity(
                getConfig().environment.surfaceColor,
                Number(newValue),
            ),
        };
        setActiveConfig();
    });

    getIncludeLanternCheckbox().addEventListener('change', () => {
        const newValue = getIncludeLanternCheckbox().checked;

        menuConfig.lantern = {
            ...menuConfig.lantern,
            include: newValue,
        };
        setActiveConfig();

        if (newValue) {
            objectManager.initializeLanterns();
        } else {
            objectManager.lanternMap.clear();
        }
    });

    getHideMenuOpenerCheckbox().addEventListener('change', () => {
        const menuOpener = document.getElementById(
            'menuOpener',
        ) as HTMLInputElement;
        if (menuOpener) {
            menuOpener.style.opacity =
                menuOpener.style.opacity === '0' ? '1' : '0';
        }
    });

    const themeDropdownMenu = document.querySelector(
        '#themeDropdown',
    ) as HTMLElement;

    populateMenuInputs();
    themeDropdownMenu.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('dropdown-item')) {
            const newTheme = target.id;

            // Clear menu config before updating theme
            menuConfig = {};
            setManualTheme(newTheme);
            populateMenuInputs();
        }
    });
}

export function getMenuConfig(): PartialConfig {
    return menuConfig;
}
