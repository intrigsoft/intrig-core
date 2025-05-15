import {Module} from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import discoveryConfig from "./discovery.config";
import {DiscoveryService} from "./discovery.service";

@Module({
    imports: [
        ConfigModule.forFeature(discoveryConfig),
    ],
    providers: [DiscoveryService],
    exports: [DiscoveryService]
})
export class DiscoveryModule {}
