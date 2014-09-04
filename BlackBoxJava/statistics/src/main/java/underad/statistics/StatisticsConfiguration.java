package underad.statistics;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.dropwizard.Configuration;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

public class StatisticsConfiguration extends Configuration {
    @Valid
    @NotNull
    @JsonProperty
    private RedisConfiguration redis = new RedisConfiguration();

    public RedisConfiguration getRedisConfiguration() {
        return redis;
    }
}
