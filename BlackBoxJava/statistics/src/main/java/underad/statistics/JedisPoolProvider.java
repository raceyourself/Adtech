package underad.statistics;

import com.sun.jersey.spi.inject.SingletonTypeInjectableProvider;
import redis.clients.jedis.JedisPool;

import javax.ws.rs.core.Context;
import javax.ws.rs.ext.Provider;

@Provider
public class JedisPoolProvider extends SingletonTypeInjectableProvider<Context, JedisPool> {
    public JedisPoolProvider(JedisPool pool) {
        super(JedisPool.class, pool);
    }
}