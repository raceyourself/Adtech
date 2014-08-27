package underad.blackbox;

import io.dropwizard.Application;
import io.dropwizard.db.DataSourceFactory;
import io.dropwizard.jdbi.DBIFactory;
import io.dropwizard.migrations.MigrationsBundle;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;
import io.dropwizard.views.ViewBundle;

import org.skife.jdbi.v2.DBI;

import underad.blackbox.health.BlackboxHealthCheck;
import underad.blackbox.jdbi.AdAugmentDao;
import underad.blackbox.jdbi.PublisherPasswordDao;
import underad.blackbox.resources.JsIncludeResource;
import underad.blackbox.resources.ReconstructResource;

public class BlackboxApplication extends Application<BlackboxConfiguration> {
	
	public static void main(String[] args) throws Exception {
		new BlackboxApplication().run(args);
	}
	
	@Override
	public void initialize(Bootstrap<BlackboxConfiguration> bootstrap) {
		// For database migrations.
	    bootstrap.addBundle(new MigrationsBundle<BlackboxConfiguration>() {
	        @Override
            public DataSourceFactory getDataSourceFactory(BlackboxConfiguration configuration) {
                return configuration.getDataSourceFactory();
            }
	    });
	    // For JavaScript templating.
	    bootstrap.addBundle(new ViewBundle());
	}
	
	@Override
	public void run(BlackboxConfiguration config, Environment env) throws Exception {
		// TODO replace as much of this as possible with dependency injection (use Dagger)
		
	    DBIFactory factory = new DBIFactory();
	    DBI jdbi = factory.build(env, config.getDataSourceFactory(), "database");
	    
		AdAugmentDao adAugmentDao = jdbi.onDemand(AdAugmentDao.class);
		PublisherPasswordDao publisherKeyDao = jdbi.onDemand(PublisherPasswordDao.class);
		
		ReconstructResource reconstructResource = new ReconstructResource();
		env.jersey().register(reconstructResource);

		JsIncludeResource jsIncludeResource = new JsIncludeResource(adAugmentDao, publisherKeyDao);
		env.jersey().register(jsIncludeResource);
		
		BlackboxHealthCheck healthCheck = new BlackboxHealthCheck(config.getTemplate());
		env.healthChecks().register("template", healthCheck);
	}
}
