package underad.blackbox.core.util;

import java.nio.charset.Charset;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base64;

public class Crypto {
	private static final Charset CHARSET = Charset.forName("UTF-8");
	private static final Cipher CIPHER;
	private static final IvParameterSpec INIT_VECTOR_PARAM_SPEC;
	private static final int requiredKeyBytes = 32; // = 256-bit
	
	static {
		try {
			// Padding required to allow for ciphering of arbitrary-length inputs
			CIPHER = Cipher.getInstance("AES/CBC/PKCS5Padding");
			/*
			 * We want a nil initialisation vector, as otherwise even when the key is the same, regeneration of the page
			 * will result in different cipher texts. This in turn would result in cache misses for downloaded images/JS
			 * etc when fresh HTML is retrieved.
			 */
			INIT_VECTOR_PARAM_SPEC = new IvParameterSpec(new byte[CIPHER.getBlockSize()]);
		} catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
			/*
			 * NoSuchAlgorithmException/NoSuchPaddingException won't happen because
			 * cipher is hard-coded.
			 */
			throw new Error("These should never have been checked exceptions...");
		}
	}
	
	public static String encrypt(String key, String plainText) {
		byte[] plainTextBytes = plainText.getBytes(CHARSET);
	    byte[] cipherTextBytes = crypt(key, plainTextBytes, Cipher.ENCRYPT_MODE);
	    return new String(Base64.encodeBase64(cipherTextBytes), CHARSET);
	}
	
	public static String decrypt(String key, String cipherText) {
		byte[] cipherTextBytes = Base64.decodeBase64(cipherText.getBytes(CHARSET));
		byte[] originalBytes = crypt(key, cipherTextBytes, Cipher.DECRYPT_MODE);
		return new String(originalBytes, CHARSET);
	}
	
	private static byte[] crypt(String key, byte[] input, int cipherMode) {
		byte[] keyBytes = key.getBytes(CHARSET);
		if (keyBytes.length != requiredKeyBytes)
			throw new IllegalArgumentException("Invalid key size.");

		SecretKeySpec skeySpec = new SecretKeySpec(keyBytes, "AES");
		try {
			CIPHER.init(cipherMode, skeySpec, INIT_VECTOR_PARAM_SPEC);
			byte[] cipherTextBytes = CIPHER.doFinal(input);
			return cipherTextBytes;
		} catch (InvalidAlgorithmParameterException | IllegalBlockSizeException | BadPaddingException e) {
			/*
			 * InvalidAlgorithmParameterException won't happen because cipher is
			 * hard-coded. IllegalBlockSizeException can't happen with
			 * PKCS5Padding. BadPaddingException can only ever happen when
			 * decrypting.
			 */
			throw new Error("These should never have been checked exceptions... (2)");
		} catch (InvalidKeyException e) {
			throw new IllegalArgumentException(String.format("Key is invalid: %s", key), e);
		}
	}
}
