package underad.blackbox.jdbi;

import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.customizers.RegisterMapper;

import underad.blackbox.core.AdvertMetadata;

import com.google.common.collect.ImmutableSet;

@RegisterMapper(AdvertMetadataMapper.class)
public interface AdAugmentDao {
	@SqlQuery("select blocked_abs_xpath, advert_rel_xpath, width_with_unit, height_with_unit "
			+ "from adverts where :url like url")
	ImmutableSet<AdvertMetadata> getAdverts(@Bind("url") String url);
}
