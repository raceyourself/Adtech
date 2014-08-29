package underad.blackbox.jdbi;

import org.joda.time.DateTime;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.customizers.RegisterMapper;

import underad.blackbox.core.AdvertMetadata;

import com.google.common.collect.ImmutableSet;

@RegisterMapper(AdvertMetadataMapper.class)
public interface AdAugmentDao {
	@SqlQuery("select id, blocked_abs_xpath, advert_rel_xpath, width_with_unit, height_with_unit from adverts "
			+ "where :url like url "
			+ "and effective < :publisher_ts "
			+ "and (obsolete is null or obsolete > :publisher_ts)")
	ImmutableSet<AdvertMetadata> getAdverts(@Bind("url") String url, @Bind("publisher_ts") DateTime publisherTs);
}
