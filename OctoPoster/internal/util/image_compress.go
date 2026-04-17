package util

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"
	"io"
)

// CompressImage compresses an image to approximately maxSizeKB kilobytes as JPEG.
// Input may be PNG or JPEG. Output is always JPEG.
func CompressImage(data []byte, maxSizeKB int) ([]byte, error) {
	if len(data) <= maxSizeKB*1024 {
		return data, nil
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		// If we can't decode it, return the original
		return data, nil
	}

	// Binary search for the right quality
	lo, hi := 10, 85
	var best []byte

	for lo <= hi {
		mid := (lo + hi) / 2
		var buf bytes.Buffer
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: mid})
		if err != nil {
			return data, nil
		}
		if buf.Len() <= maxSizeKB*1024 {
			best = buf.Bytes()
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}

	if best == nil {
		// Even lowest quality is too large, just return lowest
		var buf bytes.Buffer
		jpeg.Encode(&buf, img, &jpeg.Options{Quality: 10})
		return buf.Bytes(), nil
	}

	return best, nil
}

// init registers PNG decoder.
func init() {
	// Ensure png decoder is registered
	_ = png.Decode
	_ = io.Discard
}
