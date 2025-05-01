import { registerAs } from '@nestjs/config';
import * as os from 'os';

export default registerAs('discovery', () => {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    return {
        dir: process.env.DISCOVERY_DIR || os.tmpdir(),
        projectName: process.env.PROJECT_NAME || 'nest-app',
        port,
        url: process.env.APP_URL || `http://localhost:${port}`,
    };
});
