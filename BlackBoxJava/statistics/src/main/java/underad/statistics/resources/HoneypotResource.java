package underad.statistics.resources;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.JedisPool;
import underad.statistics.core.Response;

import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

@Slf4j
@Path("/ads/show_ads.js")
@Produces("application/javascript")
public class HoneypotResource {
    @Context
    JedisPool jedis;

    public static final String REDIS_HONEYPOT_KEY = "honeypot";

    @GET
    public String honeypot(@QueryParam("ua") String id) {
        if (id == null) {
            // Still count bad requests
            id = "";
        }
        jedis.getResource().incr(REDIS_HONEYPOT_KEY + ":" + id);
        return "false;";
    }
}
