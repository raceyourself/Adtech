package underad.statistics;

import com.codahale.metrics.health.HealthCheck;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

public class JedisPoolHealthCheck extends HealthCheck {
    private final JedisPool jedisPool;

    public JedisPoolHealthCheck(String name, JedisPool jedisPool) {
        this.jedisPool = jedisPool;
    }

    @Override
    protected Result check() throws Exception {
        Jedis jedis = jedisPool.getResource();
        try {
            String reply = jedis.ping();
            jedisPool.returnResource(jedis);
            if (!reply.equalsIgnoreCase("PONG")) {
                return Result.unhealthy("ping response is not pong");
            }
        } catch(Exception e) {
            jedisPool.returnBrokenResource(jedis);
            return Result.unhealthy(e.getMessage());
        }
        return Result.healthy();
    }
}