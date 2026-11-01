export const driverPins = [
  { name: 'uiautomator2', version: '8.7.0', platforms: ['darwin', 'linux', 'win32'] },
  { name: 'xcuitest', version: '12.18.2', platforms: ['darwin'] },
];

export function planDriverActions(installed, pins, platform) {
  return pins.map(({ name, version, platforms }) => {
    if (!platforms.includes(platform)) return { kind: 'skip', name, version };
    const current = installed[name];
    if (current === undefined) return { kind: 'install', name, version };
    return { kind: current.version === version ? 'keep' : 'reinstall', name, version };
  });
}
