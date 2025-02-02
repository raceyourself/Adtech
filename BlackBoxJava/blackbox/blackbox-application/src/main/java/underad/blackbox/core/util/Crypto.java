package underad.blackbox.core.util;

import java.nio.charset.Charset;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Arrays;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

import lombok.extern.slf4j.Slf4j;

import org.apache.commons.codec.binary.Base64;
import org.joda.time.DateTime;
import org.joda.time.Duration;

@Slf4j
public class Crypto {
	// Ideally use SHA512... though appears to require usage of Bouncy Castle libs.
	private static final String PBKDF2_HASH_ALGORITHM = "PBKDF2WithHmacSHA1";
	private static final int PBKDF2_ITERATIONS = 65000;
	private static final int PBKDF2_HASH_BYTE_SIZE = 32;
	
	private static final Charset CHARSET = Charset.forName("UTF-8");
	private static final Cipher CIPHER;
	private static final IvParameterSpec INIT_VECTOR_PARAM_SPEC;
	// 600,000ms = 600s = 10 mins
	private static final Duration KEY_DURATION = new Duration(600000);
	/**
	 * Salt is mandatory, but we don't want it to be dynamic as that would break caching. We're changing the keys
	 * anyway over time - see KEY_DURATION.
	 */
	private static final byte[] NULL_SALT = Arrays.copyOfRange(Base64.encodeBase64("FIXED".getBytes()), 0, 8);
	
	static {
		try {
			// PKCS5Padding required to allow for ciphering of arbitrary-length inputs
			CIPHER = Cipher.getInstance("AES/CBC/PKCS5Padding");
			/*
			 * We want a nil initialisation vector, as otherwise even when the key is the same, regeneration of the page
			 * will result in different cipher texts. This in turn would result in cache misses for downloaded images/JS
			 * etc when fresh HTML is retrieved.
			 */
//			byte[] ivBytes = new byte[CIPHER.getBlockSize()];
			byte[] ivBytes = "FIXED_1234567890".getBytes(); // must be exactly 16 bytes long.
			INIT_VECTOR_PARAM_SPEC = new IvParameterSpec(ivBytes);
		} catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
			/*
			 * NoSuchAlgorithmException/NoSuchPaddingException won't happen because
			 * cipher is hard-coded.
			 */
			throw new Error("These should never have been checked exceptions...");
		}
	}
	
	public static String encrypt(String password, DateTime publisherTs, String plainText) {
		byte[] plainTextBytes = plainText.getBytes(CHARSET);
	    byte[] cipherTextBytes = crypt(password, publisherTs, plainTextBytes, Cipher.ENCRYPT_MODE);
	    return new String(Base64.encodeBase64(cipherTextBytes), CHARSET);
	}
	
	public static String decrypt(String password, DateTime publisherTs, String cipherText) {
		byte[] cipherTextBytes = Base64.decodeBase64(cipherText.getBytes(CHARSET));
		
		byte[] originalBytes = crypt(password, publisherTs, cipherTextBytes, Cipher.DECRYPT_MODE);
		return new String(originalBytes, CHARSET);
	}
	
	private static byte[] crypt(String password, DateTime publisherTs, byte[] input, int cipherMode) {
		long period = publisherTs.getMillis() / KEY_DURATION.getMillis();
		String periodedPassword = period + password;
		SecretKey key = null;
		try {
			SecretKeyFactory factory = SecretKeyFactory.getInstance(PBKDF2_HASH_ALGORITHM);
			KeySpec spec = new PBEKeySpec(
					periodedPassword.toCharArray(), NULL_SALT, PBKDF2_ITERATIONS, PBKDF2_HASH_BYTE_SIZE * 8);
			// Need key to have algorithm set to AES, hence one SecretKey (from generateSecret()) being used to make another
			key = new SecretKeySpec(factory.generateSecret(spec).getEncoded(), "AES");
			
			// FIXME HAXXX can't get PBKDF2-derived keys consistent across Java/PHP/Perl, so doing something more stupid
			String dumbKey = dumbKeyDerivation(periodedPassword);
//			log.debug("k=" + dumbKey);
			key = new SecretKeySpec(dumbKey.getBytes(), "AES");
			
			CIPHER.init(cipherMode, key, INIT_VECTOR_PARAM_SPEC);
			byte[] cipherTextBytes = CIPHER.doFinal(input);
			
			return cipherTextBytes;
		} catch (NoSuchAlgorithmException | InvalidAlgorithmParameterException | IllegalBlockSizeException e) {
			/*
			 * NoSuchAlgorithmException/InvalidAlgorithmParameterException won't happen as values are hardcoded.
			 * IllegalBlockSizeException can't happen with PKCS5Padding.
			 */
			throw new Error("These should never have been checked exceptions... (2)");
		} catch (InvalidKeySpecException | InvalidKeyException e) {
			throw new IllegalArgumentException(String.format("Key is invalid: %s", key), e);
		} catch (BadPaddingException e) {
			throw new IllegalArgumentException(String.format("Input ciphertext is invalid: %s", input));
		}
	}
	
	private static String dumbKeyDerivation(String password) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < 10; i++) {
			sb.append(password);
		}
		return sb.substring(0, 32);
	}
}
