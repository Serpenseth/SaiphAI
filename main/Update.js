const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { https } = require('follow-redirects');
const { spawn } = require('child_process');
const crypto = require('crypto');

const UserDataPath = {
  async fetch() {
    const { default: envPaths } = await import('env-paths');
    let paths = envPaths('SaiphAI');
    paths = paths.config;
    paths = paths.replace('-nodejs\\Config', '');
    return paths;
  },
}

const GithubHandler = {
  async getGithubVersion(event) {
    const request = await fetch("https://raw.githubusercontent.com/Serpenseth/SaiphAI/refs/heads/main/package.json");

    if (!request.ok) {
      event.sender.send("update-error", "Failed to fetch remote version");
      return '0.0.0';
    }

    const data = await request.json();
    return data.version;
  },

  async getGithubPackageData(event) {
    try {
      const request = await fetch("https://api.github.com/repos/serpenseth/saiphai/releases/latest");

      if (!request.ok) {
        event.send(
          "update-error",
          "Seems like either you have internet problems, "
          + "or you've been downloading/canceling a little too often.\n"
          + "Try again later"
        );
        return;
      }

      const data = await request.json();

      // Data obtained from Github
      const os = process.platform;
      const isMac = os === 'darwin';
      const isWindows = process.platform === "win32";
      const extension = isMac ? ".dmg" : isWindows ? ".exe" : ".AppImage";
      const tag = data.tag_name;
      const version = tag.replace("v", "");
      const baseDownloadUrl = "https://github.com/Serpenseth/SaiphAI/releases/download";
      const digest = data.assets.find(x => x.name.includes(extension)).digest;

      return {
        releaseNotes: data.body,
        tag: tag,
        downloadUrl: `${baseDownloadUrl}/${tag}/SaiphAI-${version}${extension}`,
        digest: digest
      }
    }
    catch(e) {
      event.send("update-error", e.message);
    }
  },
}

const Update = {
  updaterFileName: null,
  updaterFilePath: null,

  async checkForUpdates(event, currentVersion) {
    const githubVersion = await GithubHandler.getGithubVersion();

    if (githubVersion === '0.0.0') {
      event.send("update-error", "Failed to fetch remote version");
      return;
    }

    if (currentVersion !== githubVersion) {
      const githubData = await GithubHandler.getGithubPackageData(event);
      event.send('update-available', {
        localVersion: currentVersion,
        remoteVersion: githubVersion,
        githubData: githubData
      });
    }
    else
      event.send('update-not-available');
  },

  async downloadUpdate(event, githubData) {
    const data = githubData.githubData;
    const downloadUrl = data.downloadUrl;
    const expectedDigest = data.digest;
    const userDataPath = await UserDataPath.fetch();

    const updateDir = path.join(userDataPath, 'updates');
    const fileName = path.basename(downloadUrl);
    const filePath = path.join(updateDir, fileName);
    Update.updaterFileName = fileName;
    Update.updaterFilePath = filePath;

    // Ensure update directory exists
    await fs.mkdir(updateDir, { recursive: true });

    return new Promise((resolve) => {
      const file = fsSync.createWriteStream(filePath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      const hash = crypto.createHash('sha256');

      https.get(downloadUrl, (response) => {
        totalBytes = parseInt(response.headers['content-length'] || '0', 10);

        event.send('update-download-progress', {
          downloaded: 0,
          total: totalBytes,
          percent: 0
        });

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          hash.update(chunk);

          const percent = Math.round((downloadedBytes / totalBytes) * 100);

          // Send progress to renderer
          event.send('update-download-progress', {
            downloaded: downloadedBytes,
            total: totalBytes,
            percent: Math.round((downloadedBytes / totalBytes) * 100)
          });
        });

        response.pipe(file);

        file.on('close', () => {
          // Verify digest
          if (expectedDigest) {
            const normalizedExpected = expectedDigest.replace(/^sha256:/, '').toLowerCase();
            const fileBuffer = fsSync.readFileSync(filePath);
            const actualDigest = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            if (actualDigest !== normalizedExpected) {
              fs.unlink(filePath, () => {});

              resolve({
                success: false,
                error: 'Digest verification failed',
                expected: expectedDigest,
                actual: actualDigest
              });
              return;
            }

            else
              resolve({ success: true });
          }
        })

        file.on('error', (e) => {
          event.send("update-error", e);
          fs.unlink(filePath, () => {});
          resolve({ success: false, error: e.message });
        });
      })
      .on('error', (err) => {
        event.send("update-error", err);
        fs.unlink(filePath, () => {});
        resolve({ success: false, error: err.message });
      });
    });
  },

  async installUpdate() {
    // Auto-execute based on OS
    const platform = process.platform;
    const { updaterFileName, updaterFilePath } = Update;

    new Promise((resolve) => {
      if (platform === 'win32' && updaterFileName.endsWith('.exe')) {
        const child = spawn(updaterFilePath, [], { detached: true }, (err) => {
          if (err) {
            fs.unlink(updaterFilePath, () => {});
            resolve({ success: false, error: err.message });
            return;
          }
          child.unref();
        });
        resolve({ success: true, updaterFilePath, action: 'executing' });
      }
      else if (platform === 'darwin' && updaterFileName.endsWith('.dmg')) {
        shell.openPath(updaterFilePath);
        resolve({ success: true, updaterFilePath, action: 'opened' });
      }
      else if (platform === 'linux' && updaterFileName.endsWith('.AppImage')) {
        fs.chmod(updaterFilePath, 0o755, () => {

        const child = spawn(updaterFilePath, [], { detached: true }, (err) => {
        if (err) {
            fs.unlink(filePath, () => {});
            resolve({ success: false, error: err.message });
            return;
          }
        });
        child.unref();
      });
      resolve({ success: true, updaterFilePath, action: 'executing' });
      }
      else {
        shell.showItemInFolder(updaterFilePath);
        resolve({ success: true, updaterFilePath, action: 'downloaded' });
      }
      process.kill(process.pid, 'SIGKILL');
    });
  },
}

module.exports = { Update };
