package underad.statistics;

import io.dropwizard.Application;
import io.dropwizard.lifecycle.Managed;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;
import redis.clients.jedis.JedisPool;
import underad.statistics.resources.HitResource;
import underad.statistics.resources.HoneypotResource;

public class StatisticsApplication extends Application<StatisticsConfiguration> {
    public static void main(String[] args) throws Exception {
        new StatisticsApplication().run(args);
    }

    @Override
    public String getName() {
        return "underad-statistics";
    }

    @Override
    public void initialize(Bootstrap<StatisticsConfiguration> bootstrap) {
    }

    @Override
    public void run(StatisticsConfiguration configuration, Environment environment) throws Exception {
        // Databases
        RedisConfiguration redis = configuration.getRedisConfiguration();
        final JedisPool jedis = new JedisPool(redis.getPoolConfig(), redis.getHostname(), redis.getPort());

        environment.healthChecks().register("redis", new JedisPoolHealthCheck("jedis-pool", jedis));
        environment.lifecycle().manage(new Managed() {
            @Override
            public void start() throws Exception {
            }

            @Override
            public void stop() throws Exception {
                jedis.destroy();
            }
        });
        environment.jersey().register(new JedisPoolProvider(jedis));

        // Resources
        environment.jersey().register(new HitResource());
        environment.jersey().register(new HoneypotResource());
    }
}
