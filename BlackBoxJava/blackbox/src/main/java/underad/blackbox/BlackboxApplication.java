package underad.blackbox;

import underad.blackbox.health.BlackboxHealthCheck;
import io.dropwizard.Application;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;
import lombok.Getter;

public class BlackboxApplication extends Application<BlackboxConfig> {
	
	@Getter
	private String name = "hello_world";
	
	public static void main(String[] args) throws Exception {
		new BlackboxApplication().run(args);
	}
	
	@Override
	public void run(BlackboxConfig config, Environment env) throws Exception {
		final BlackboxResource resource = new BlackboxResource(config.getTemplate(), config.getDefaultName());
		env.jersey().register(resource);
		
		final BlackboxHealthCheck healthCheck = new BlackboxHealthCheck(config.getTemplate());
		env.healthChecks().register("template", healthCheck);
	}
	
	@Override
	public void initialize(Bootstrap<BlackboxConfig> bootstrap) {
		
	}
}
